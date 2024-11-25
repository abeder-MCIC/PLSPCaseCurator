/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off" */
/* eslint default-case: "off" */

import { LightningElement, api } from 'lwc';

export default class PccMeasureInput extends LightningElement {
  /***************************
   * Inputs
   */

  @api fieldName; //  API name of the field
  @api label; //  field label
  @api type; //  'number' or 'date'
  selectOption = "ANY";
  between = false;
  value;
  start;
  end;
  measureOptions;

  connectedCallback() {
    this.measureOptions = [
      { label: 'any', value: 'ANY' },
      { label: 'greater than', value: 'GT' },
      { label: 'less than', value: 'LT' },
      { label: 'greater or equal to', value: 'GE' },
      { label: 'less or equal to', value: 'LE' }
    ];
    if (this.type == 'number') {
      this.measureOptions.push({ label: 'equal to', value: 'EQ' });
      this.measureOptions.push({ label: 'does not equal', value: 'NE' });
    }
    this.measureOptions.push({ label: 'between', value: 'BE' });
  }

  get isBetween() {
    return this.between;
  }

  handleChange(event) {
    var value = event.detail.value;
    if (value == 'BE') {
      this.between = true;
    } else {
      this.between = false;
    }
    this.selectOption = value;
    this.updateSelection();
  }

  handleValue(event) {
    this.value = event.detail.value;
    this.updateSelection();
  }

  handleStart(event) {
    this.start = event.detail.value;
    this.updateSelection();
  }

  handleEnd(event) {
    this.end = event.detail.value;
    this.updateSelection();
  }

  updateSelection() {
    // Bubble event up to parent
    const selectEvent = new CustomEvent('selection', {
      detail: {
        type: this.type == 'number' ? 'Measure' : 'Date',
        name: this.fieldName,
        selection: this.selectOption,
        value: this.value,
        start: this.start,
        end: this.end
      }
    });
    this.dispatchEvent(selectEvent);
  }
}
