import { FieldValue, Timestamp, type Firestore, type Transaction } from "@google-cloud/firestore"

type Data = Record<string, unknown>
type Filter = [string, "==" | ">" | ">=", unknown]
type Snapshot = Map<string, Data>

class Document {
  constructor(readonly path: string, private readonly store: FakeFirestore) {}
  get() { return Promise.resolve(this.store.document(this.path, this.store.documents)) }
}

class Query {
  constructor(
    private readonly store: FakeFirestore,
    readonly collectionPath: string,
    readonly filters: Filter[] = [],
    readonly order?: [string, "asc" | "desc"],
    readonly size = Infinity,
  ) {}
  doc(id: string) { return new Document(`${this.collectionPath}/${id}`, this.store) }
  where(...filter: Filter) {
    return new Query(this.store, this.collectionPath, [...this.filters, filter], this.order, this.size)
  }
  orderBy(field: string, direction: "asc" | "desc") {
    return new Query(this.store, this.collectionPath, this.filters, [field, direction], this.size)
  }
  limit(size: number) {
    return new Query(this.store, this.collectionPath, this.filters, this.order, size)
  }
  count() { return { aggregate: this } }
  rows(snapshot: Snapshot) {
    let rows = [...snapshot].filter(([path, data]) =>
      path.startsWith(`${this.collectionPath}/`) && this.filters.every(([field, op, value]) => {
        if (!Object.hasOwn(data, field)) return false
        if (op === "==") return data[field] === value
        if (typeof data[field] !== "number" || typeof value !== "number") return false
        return op === ">" ? data[field] > value : data[field] >= value
      }))
    if (this.order) {
      const [field, direction] = this.order
      rows = rows.filter(([, data]) => Object.hasOwn(data, field))
      rows.sort(([aId, a], [bId, b]) => {
        const difference = Number(a[field] ?? -Infinity) - Number(b[field] ?? -Infinity)
        return (difference || aId.localeCompare(bId)) * (direction === "desc" ? -1 : 1)
      })
    }
    return rows.slice(0, this.size).map(([path]) => this.store.document(path, snapshot))
  }
  async get() {
    this.store.queries.push(this)
    return { docs: this.rows(this.store.documents) }
  }
}

function merge(before: Data, patch: Data): Data {
  const result = { ...before }
  for (const [key, value] of Object.entries(patch)) {
    if (value instanceof FieldValue && value.isEqual(FieldValue.serverTimestamp())) {
      result[key] = Timestamp.now()
    } else if (value && typeof value === "object" && !(value instanceof Timestamp)) {
      result[key] = merge((before[key] as Data) ?? {}, value as Data)
    } else {
      if (value === undefined) throw new Error("Firestore does not accept undefined")
      result[key] = value
    }
  }
  return result
}

/** 필터·경합 재시도·원자적 커밋을 재현하며 상태를 보존하는 테스트용 DB. */
export class FakeFirestore {
  readonly documents: Snapshot = new Map()
  readonly commits: string[][] = []
  readonly queries: Query[] = []
  readonly transactionOptions: Array<{ readOnly?: boolean } | undefined> = []
  retries = 0
  failCommitContaining: string | undefined
  private readonly versions = new Map<string, number>()
  constructor(seed: Record<string, Data> = {}) {
    for (const [path, data] of Object.entries(seed)) this.documents.set(path, data)
  }
  asFirestore() { return this as unknown as Firestore }
  collection(path: string) { return new Query(this, path) }
  getAll(...refs: Document[]) {
    return Promise.resolve(refs.map(ref => this.document(ref.path, this.documents)))
  }
  document(path: string, snapshot: Snapshot) {
    const value = snapshot.get(path)
    return {
      id: path.split("/").at(-1)!, exists: value !== undefined,
      data: () => value, get: (key: string) => value?.[key],
    }
  }
  async runTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>,
    options?: { readOnly?: boolean },
  ): Promise<T> {
    this.transactionOptions.push(options)
    for (let attempt = 0; attempt < 5; attempt++) {
      const snapshot = new Map(this.documents)
      const versions = new Map(this.versions)
      const reads = new Set<string>()
      const writes: Array<[string, Data]> = []
      const transaction = {
        get: async (target: Document | { aggregate: Query }) => {
          if (target instanceof Document) {
            reads.add(target.path)
            return this.document(target.path, snapshot)
          }
          this.queries.push(target.aggregate)
          return { data: () => ({ count: target.aggregate.rows(snapshot).length }) }
        },
        set: (ref: Document, data: Data) => { writes.push([ref.path, data]); return transaction },
      }
      const result = await callback(transaction as unknown as Transaction)
      if (options?.readOnly) return result
      if ([...reads].some(path => versions.get(path) !== this.versions.get(path))) {
        this.retries++
        continue
      }
      if (this.failCommitContaining && writes.some(([path]) => path.startsWith(this.failCommitContaining!))) {
        this.failCommitContaining = undefined
        throw new Error("simulated atomic commit failure")
      }
      if (writes.length) {
        const resolved = writes.map(([path, data]) => [path, merge(this.documents.get(path) ?? {}, data)] as const)
        for (const [path, data] of resolved) {
          this.documents.set(path, data)
          this.versions.set(path, (this.versions.get(path) ?? 0) + 1)
        }
        this.commits.push(writes.map(([path]) => path))
      }
      return result
    }
    throw new Error("transaction contention exceeded test limit")
  }
}
