import EventEmitter from 'events'

import convert from 'convert-units'
import round from '@toddself/round'
import splitMeasure from '@toddself/split-measure-units'
import * as beermath from 'beermath'

import RecipeHop from './hop'
import RecipeFermentable from './fermentable'

const types = Object.seal({
  dict: Object.seal(['all grain', 'partial mash', 'extract']),
  'all grain': 0,
  'partial mash': 1,
  extract: 2
})

const typeSym = Symbol('type')
const targetBatchAmountSym = Symbol('targetAmount')
const targetBoilAmountSym = Symbol('boilAmount')
const hopsSym = Symbol('hopsSym')
const fermentablesSym = Symbol('fermentables')
const hasMash = Symbol('hashMash')
const ogSym = Symbol('og')
const abvSym = Symbol('abv')
const ibuSym = Symbol('ibu')
const ratioSym = Symbol('ratio')
const fermentablesMassSym = Symbol('fermentablesMass')
const hopsMassSym = Symbol('hopsMass')
const srmSym = Symbol('srm')
const fgSym = Symbol('fg')

const calcVolumeUnits = 'gal'

export class Recipe extends EventEmitter {
  constructor (name, type, targetBatchVolume, equipmentProfile, mashProfile) {
    super()
    this.name = name
    this.type = type
    this.targetBatchVolume = targetBatchVolume
    this.equipmentProfile = equipmentProfile
    this.equipmentProfile.on('change', () => this.updateRecipe.bind(this))
    this.mashProfile = mashProfile || {}
    this[hasMash] = false
    this[hopsSym] = []
    this[fermentablesSym] = []
    if (this.type === types['all grain'] || this.type === types['partial mash']) {
      this.mashProfile.on('change', () => this.updateRecipe.bind(this))
      this[hasMash] = true
    }
    this.on('change', this.updateRecipe.bind(this))
  }

  set name (name) {
    this._name = name
    this.emit('change', {name: this.name})
  }

  get name () {
    return this._name
  }

  set type (type) {
    this[typeSym] = types[type] || 'all grain'
    this.emit('change', {type: this.type})
  }

  get type () {
    return types.dict[this[typeSym]]
  }

  set targetBatchVolume (volume) {
    let amount = volume
    if (typeof volume === 'string') {
      [amount] = splitMeasure(volume, calcVolumeUnits)
    }
    this[targetBatchAmountSym] = amount
    this.emit('change', {targetBatchVolume: this.targetBatchVolume})
    if (this[hasMash]) {
      this.mashProfile.emit('change', {targetBatchVolume: this.targetBatchVolume})
    }
  }

  get targetBatchVolume () {
    let amount = `${this[targetBatchAmountSym]} ${calcVolumeUnits}`
    const measure = this.equipmentProfile.volumeMeasure
    if (calcVolumeUnits !== measure) {
      const converted = round(convert(this[targetBatchAmountSym]).from(calcVolumeUnits).to(measure), 2)
      amount = `${converted} ${measure}`
    }
    return amount
  }

  set targetBoilVolume (volume) {
    let amount = volume
    if (typeof amount === 'string') {
      [amount] = splitMeasure(volume, calcVolumeUnits)
    }
    this[targetBoilAmountSym] = amount
    this.emit('change', {targetBoilVolume: this.targetBoilVolume})
  }

  get targetBoilVolume () {
    let amount = `${this[targetBoilAmountSym]} ${calcVolumeUnits}`
    const measure = this.equipmentProfile.volumeMeasure
    if (calcVolumeUnits !== measure) {
      const converted = round(convert(this[targetBoilAmountSym]).from(calcVolumeUnits).to(measure), 2)
      amount = `${converted} ${measure}`
    }
    return amount
  }

  updateRecipe (update) {
    Object.keys(update).forEach(key => {
      switch (key) {
        case 'fermentables':
          this.updateOG()
          this.updateFG()
          this.updateIBU()
          this.updateABV()
          this.updateSRM()
          this.updateRatio()
          this.updateFermentablesMass()
          break
        case 'equipment':
          this.updateTargetBoilVolume()
          this.updateOG()
          this.updateFG()
          this.updateABV()
          break
        case 'mash':
          this.updateTargetBoilVolume()
          break
        case 'hops':
          this.updateIBU()
          this.updateRatio()
          this.updateHopsMass()
          break
        case 'targetBatchAmount':
          this.updateTargetBoilVolume()
          this.updateOG()
          this.updateFG()
          this.updateIBU()
          this.updateSRM()
          this.updateABV()
          this.updateRatio()
          break
        default:
          break
      }
    })
  }

  updateTargetBoilVolume (update) {
    const [boilOff] = splitMeasure(this.equipmentProfile.boilOff, calcVolumeUnits)
    const [kettleLoss] = splitMeasure(this.equipmentProfile.kettleLoss, calcVolumeUnits)
    this.targetBoilVolume = boilOff + kettleLoss + this[targetBatchAmountSym]
  }

  updateOG () {
    const fermentables = this[fermentablesSym].map(ferm => ferm.gu)
    this[ogSym] = beermath.og(fermentables, this.equipmentProfile.efficiency, this[targetBatchAmountSym])
  }

  get OG () {
    return this[ogSym]
  }

  updateIBU () {
    const formula = this.equipmentProfile.hopFormula || 'tinseth'
    const batchVol = this[targetBatchAmountSym]
    const OG = this.OG
    this[ibuSym] = this[hopsSym].reduce((ibu, hop) => {
      const weight = hop.weight
      const alpha = hop.alpha
      const time = hop.time
      if (formula === 'garetz') {
        const boilVol = this[targetBoilAmountSym]
        const elevation = this.equipmentProfile.elevation
        let ibuWeight = beermath.tinseth(weight, alpha, time, batchVol, OG)
        ibuWeight += beermath.rager(weight, alpha, time, batchVol, OG)
        ibu += beermath.garetz(weight, alpha, time, batchVol, OG, boilVol, ibuWeight, elevation)
      } else {
        ibu += beermath[formula](weight, alpha, time, batchVol, OG)
      }
      return ibu
    }, 0)
  }

  get IBU () {
    return this[ibuSym]
  }

  updateSRM () {
    this[srmSym] = round(this[fermentablesSym].reduce((srm, ferm) => srm += ferm.color, 0), 0)
  }

  get SRM () {
    return this[srmSym]
  }

  updateABV () {
    this[abvSym] = beermath.abv(this.OG, this.FG)
  }

  get ABV () {
    return this[abvSym]
  }

  updateFG () {
    this[fgSym] = beermath.fg(this.OG, this.yeast.attentuation)
  }

  get FG () {
    return [fgSym]
  }

  updateRatio () {
    this[ratioSym] = this.IBU / ((this.OG - 1) * 1000)
  }

  get ratio () {
    return this[ratioSym]
  }

  updateFermentablesMass () {
    this[fermentablesMassSym] = this[fermentablesSym].reduce((mass, ferm) => mass += ferm.weight, 0)
  }

  get fermentablesMass () {
    return this[fermentablesMassSym]
  }

  updateHopsMass () {
    this[hopsMassSym] = this[hopsSym].reduce((mass, hop) => mass += hop.weight, 0)
  }

  get hopsMass () {
    return this[hopsMassSym]
  }

  set hops (...hops) {
    this[hopsSym].concat(hopsSym.filter(hop => hop instanceof RecipeHop))
    this.emit('change', {hops: this.hops})
  }

  get hops () {
    return this[hopsSym]
  }

  set fermentables (...fermentables) {
    this[fermentablesSym].concat(fermentables.filter(fermentable => fermentable instanceof RecipeFermentable))
    this.emit('change', {fermentables: this.fermentables})
    if (this[hasMash]) {
      this.mashProfile.emit('change', {fermentables: this.fermentables})
    }
  }

  get fermentables () {
    return this[fermentablesSym]
  }
}
