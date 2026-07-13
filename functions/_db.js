export async function query(db, sql, params = []) {
  const { results } = await db.prepare(sql).bind(...params).all()
  return results
}

export async function queryOne(db, sql, params = []) {
  return await db.prepare(sql).bind(...params).first()
}

export async function execute(db, sql, params = []) {
  return await db.prepare(sql).bind(...params).run()
}
