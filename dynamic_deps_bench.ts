import { printLogs, formatLog } from './utils'

async function testAggregateGrowing(count: number) {
  const mol_wire_lib = await import('mol_wire_lib')
  const { $mol_wire_atom } = mol_wire_lib.default

  const { atom, createCtx } = await import('@reatom/core')

  const { observable, computed, autorun, configure } = await import('mobx')
  configure({ enforceActions: 'never' })

  const molAtoms = [new $mol_wire_atom(`0`, (next: number = 0) => next)]
  const reAtoms = [atom(0, `${0}`)]
  const mobxAtoms = [observable.box(0, { name: `${0}` })]

  const molAtom = new $mol_wire_atom(`sum`, () =>
    molAtoms.reduce((sum, atom) => sum + atom.sync(), 0),
  )
  const reAtom = atom(
    (ctx) => reAtoms.reduce((sum, atom) => sum + ctx.spy(atom), 0),
    `sum`,
  )
  const mobxAtom = computed(
    () => mobxAtoms.reduce((sum, atom) => sum + atom.get(), 0),
    { name: `sum` },
  )
  const ctx = createCtx()

  ctx.subscribe(reAtom, () => {})
  molAtom.sync()
  autorun(() => mobxAtom.get())

  const reatomLogs = new Array<number>()
  const molLogs = new Array<number>()
  const mobxLogs = new Array<number>()
  let i = 1
  while (i++ < count) {
    const startReatom = performance.now()
    reAtoms.push(atom(i, `${i}`))
    reAtoms.at(-2)!(ctx, i)
    reatomLogs.push(performance.now() - startReatom)

    const startMol = performance.now()
    molAtoms.push(new $mol_wire_atom(`${i}`, (next: number = i) => next))
    molAtoms.at(-2)!.put(i)
    molAtom.sync()
    molLogs.push(performance.now() - startMol)

    const startMobx = performance.now()
    mobxAtoms.push(observable.box(i, { name: `${i}` }))
    mobxAtoms.at(-2)!.set(i)
    mobxLogs.push(performance.now() - startMobx)

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  if (new Set([molAtom.sync(), ctx.get(reAtom), mobxAtom.get()]).size > 1) {
    throw new Error(
      'Mismatch: ' +
        JSON.stringify({
          mol: molAtom.sync(),
          reatom: ctx.get(reAtom),
          mobx: mobxAtom.get(),
        }),
    )
  }

  console.log(`Median of sum calc of reactive nodes in list from 1 to ${count}`)

  printLogs({
    reatom: formatLog(reatomLogs),
    $mol_wire: formatLog(molLogs),
    mobx: formatLog(mobxLogs),
  })
}

async function testAggregateShrinking(count: number) {
  const mol_wire_lib = await import('mol_wire_lib')
  const { $mol_wire_atom } = mol_wire_lib.default

  const { atom, createCtx } = await import('@reatom/core')

  const { observable, computed, autorun, configure } = await import('mobx')
  configure({ enforceActions: 'never' })

  const molAtoms = Array.from(
    { length: count },
    (_, i) => new $mol_wire_atom(`${i}`, (next: number = 0) => next),
  )
  const reAtoms = Array.from({ length: count }, (_, i) => atom(0, `${i}`))
  const mobxAtoms = Array.from({ length: count }, (_, i) =>
    observable.box(i, { name: `${i}` }),
  )

  const molAtom = new $mol_wire_atom(`sum`, () =>
    molAtoms.reduce((sum, atom) => sum + atom.sync(), 0),
  )
  const reAtom = atom(
    (ctx) => reAtoms.reduce((sum, atom) => sum + ctx.spy(atom), 0),
    `sum`,
  )
  const ctx = createCtx()
  const mobxAtom = computed(
    () => mobxAtoms.reduce((sum, atom) => sum + atom.get(), 0),
    { name: `sum` },
  )

  ctx.subscribe(reAtom, () => {})
  molAtom.sync()
  autorun(() => mobxAtom.get())

  const reatomLogs = new Array<number>()
  const molLogs = new Array<number>()
  const mobxLogs = new Array<number>()
  let i = 1
  while (i++ < count) {
    const startReatom = performance.now()
    reAtoms.pop()!(ctx, i)
    reatomLogs.push(performance.now() - startReatom)

    const startMol = performance.now()
    molAtoms.pop()!.put(i)
    molAtom.sync()
    molLogs.push(performance.now() - startMol)

    const startMobx = performance.now()
    mobxAtoms.pop()!.set(i)
    mobxLogs.push(performance.now() - startMobx)

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  if (new Set([molAtom.sync(), ctx.get(reAtom), mobxAtom.get()]).size > 1) {
    throw new Error(
      'Mismatch: ' +
        JSON.stringify({
          mol: molAtom.sync(),
          reatom: ctx.get(reAtom),
          mobx: mobxAtom.get(),
        }),
    )
  }

  console.log(`Median of sum calc of reactive nodes in list from ${count} to 1`)

  printLogs({
    reatom: formatLog(reatomLogs),
    $mol_wire: formatLog(molLogs),
    mobx: formatLog(mobxLogs),
  })
}

async function testParent(count: number) {
  const mol_wire_lib = await import('mol_wire_lib')
  const { $mol_wire_atom } = mol_wire_lib.default

  const { atom, createCtx } = await import('@reatom/core')

  const { observable, computed, autorun, configure } = await import('mobx')
  configure({ enforceActions: 'never' })

  const molAtom = new $mol_wire_atom(`0`, (next: number = 0) => next)
  const reAtom = atom(0, `${0}`)
  const ctx = createCtx()
  const mobxAtom = observable.box(0, { name: `${0}` })

  {
    let i = count
    while (i--) {
      new $mol_wire_atom(`${i}`, () => molAtom.sync()).sync()

      ctx.subscribe(
        atom((ctx) => ctx.spy(reAtom)),
        () => {},
      )

      const mobxDepAtom = computed(() => mobxAtom.get())
      autorun(() => mobxDepAtom.get())
    }
  }

  const reatomLogs = new Array<number>()
  const molLogs = new Array<number>()
  const mobxLogs = new Array<number>()
  let i = 1000
  while (i--) {
    const startReatom = performance.now()
    reAtom(ctx, i)
    reatomLogs.push(performance.now() - startReatom)

    const startMol = performance.now()
    molAtom.put(i)
    molAtom.sync()
    molLogs.push(performance.now() - startMol)

    const startMobx = performance.now()
    mobxAtom.set(i)
    mobxLogs.push(performance.now() - startMobx)

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  if (new Set([molAtom.sync(), ctx.get(reAtom), mobxAtom.get()]).size > 1) {
    throw new Error(
      'Mismatch: ' +
        JSON.stringify({
          mol: molAtom.sync(),
          reatom: ctx.get(reAtom),
          mobx: mobxAtom.get(),
        }),
    )
  }

  console.log(`Median of update 1 node with ${count} reactive children`)

  printLogs({
    reatom: formatLog(reatomLogs),
    // $mol_wire: formatLog(molLogs),
    mobx: formatLog(mobxLogs),
  })
}

;(async () => {
  await testAggregateGrowing(1000)
  await testAggregateShrinking(1000)
  await testParent(1000)

  process.exit()
})()
