import splitMeasure from '@toddself/split-measure-units'

const types = Object.freeze({
  dict: Object.freeze(['pellet', 'leaf', 'plug']),
  pellet: 0,
  leaf: 1,
  plug: 2
})

const purposes = Object.freeze({
  dict: Object.freeze(['bittering', 'aroma', 'both']),
  bittering: 0,
  aroma: 1,
  both: 2
})

const typeSym = Symbol('type')
const purposeSym = Symbol('purpose')
const timeAmountSym = Symbol('timeAmount')
const timeUnitSym = Symbol('timeUnit')
const weightUnitSym = Symbol('weightUnit')
const weightAmountSym = Symbol('weightAmount')

export default class Hop {
  constructor (name, description, alpha, purpose) {
    this.types = types
    this.purposes = purposes
    this.name = name
    this.description = description
    this.alpha = alpha
    this.purpose = purpose
  }

  get purpose () {
    return this.purposes.dict[this[purposeSym]]
  }

  set purpose (purpose) {
    if (typeof purpose === 'string') {
      purpose = this.purposes.dict.indexOf(purpose)
    }
    this[purposeSym] = purpose
  }

  toString () {
    return `${this.name} (${this.alpha})`
  }

  toJSON () {
    return {
      name: this.name,
      description: this.description,
      alpha: this.alpha,
      purpose: this.purposes.dict[this[purposeSym]]
    }
  }

  create (weight, alpha, time, type) {
    const base = this.toJSON()
    const local = {weight, alpha, time, type}
    const instance = Object.assign(base, local)
    const clone = new RecipeHop()
    Object.keys(instance).forEach(key => clone[key] = instance[key])
    return clone
  }
}

export class RecipeHop extends Hop {
  constructor (weight, alpha, time, type) {
    super()
    this.weight = weight
    this.alpha = alpha
    this.time = time
    this.type = type
  }

  get type () {
    return this.types.dict[this[typeSym]]
  }

  set type (type) {
    if (typeof type === 'string') {
      type = this.types.dict.indexOf(type)
    }
    this[typeSym] = type
  }

  get time () {
    return `${this[timeAmountSym]} ${this[timeUnitSym]}`
  }

  set time (time) {
    let amount = time
    let unit = 'min'
    if (typeof time === 'string') {
      [amount, unit] = splitMeasure(time)
    }
    this[timeAmountSym] = amount
    this[timeUnitSym] = unit
  }

  get weight () {
    return `${this[weightAmountSym]} ${this[weightUnitSym]}`
  }

  set weight (weight) {
    let amount = weight
    let unit = 'oz'
    if (typeof weight === 'string') {
      [amount, unit] = splitMeasure(weight)
    }
    this[weightAmountSym] = amount
    this[weightUnitSym] = unit
  }

  toString () {
    return `${super.toString()} ${this.amount} {$this.unit}`
  }

  toJSON () {
    const local = {
      weight: this.weight,
      type: this.type,
      alpha: this.alpha,
      time: this.time
    }
    return Object.assign(super.toJSON(), local)
  }
}
