import EventEmitter from 'events'

const types = Object.seal({
  dict: Object.seal(['dry', 'liquid']),
  dry: 0,
  liquid: 0
})

const typeSym = Symbol('type')

export default class Yeast extends EventEmitter {
  constructor (name, company, type, attenuation) {
    super()
    this.name = name
    this.company = company
    this.type = type
    this.attenuation = attenuation
  }

  set type (type) {
    this[typeSym] = types[type]
  }

  get type () {
    return types.dict[this[typeSym]]
  }
}
