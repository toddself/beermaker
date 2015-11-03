import splitMeasure from '@toddself/split-measure-unit'

const types = Object.seal({
  dict: Object.seal(['grain', 'sugar', 'extract']),
  grain: 0,
  sugar: 1,
  extract: 2
})

const typeSym = Symbol('time')
const colorUnitSym = Symbol('colorUnit')
const colorAmountSym = Symbol('colorAmount')
const weightUnitSym = Symbol('weightUnit')
const weightAmountSym = Symbol('weightAmount')

export default class Fermentable {
  constructor (name, gu, color, type) {
    this.name = name
    this.gu = gu
    this.type = type
    this.color = color
  }

  get color () {
    return `${this[colorAmountSym]} ${this[colorUnitSym]}`
  }

  set color (color) {
    let colorUnit = 'SRM'
    let colorAmount = color
    if (typeof color === 'string') {
      [colorAmount, colorUnit] = splitMeasure(color)
    }
    this[colorUnitSym] = colorUnit
    this[colorAmountSym] = colorAmount
  }

  get type () {
    return types.dict[this[typeSym]]
  }

  set type (type) {
    if (typeof type === 'string') {
      type = types.dict.indexOf(type)
    }
    this[typeSym] = type
  }

  toString () {
    return this.name
  }

  toJSON () {
    return {
      name: this.name,
      gu: this.gu,
      type: this.type,
      color: this.color
    }
  }

  create (weight) {
    const base = this.toJSON()
    const local = {weight}
    const instance = Object.assign(base, local)
    const clone = new RecipeFermentable()
    Object.keys(instance).forEach(key => clone[key] = instance[key])
    return clone
  }
}

export class RecipeFermentable extends Fermentable {
  constructor (weight) {
    super()
    this.weight = weight
  }

  get weight () {
    return `${this[weightAmountSym]} ${this[weightUnitSym]}`
  }

  set weight (weight) {
    let weightUnit = 'lb'
    let weightAmount = weight
    if (typeof weight === 'string') {
      [weightAmount, weightUnit] = splitMeasure(weight)
    }
    this[weightAmountSym] = weightAmount
    this[weightUnitSym] = weightUnit
  }

  toString () {
    return `${this.name} (${this.weight})`
  }

  toJSON () {
    const local = {weight: this.weight}
    return Object.assign(super.toJSON(), local)
  }
}