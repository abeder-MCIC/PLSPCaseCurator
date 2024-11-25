/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off", default-case: "off", @lwc/lwc/no-api-reassignments: "off" */
import { LightningElement, api } from 'lwc';

export default class MeasureInput extends LightningElement {
/***************************
 * Inputs
 */

@api name;
@api label;
selectOption;
@api between = false;
value;
start;
end;


measureOptions = [
    { label: 'any', value: 'ANY' },
    { label: 'greater than', value: 'GT' },
    { label: 'less than', value: 'LT' },
    { label: 'greater or equal to', value: 'GE' },
    { label: 'less or equal to', value: 'LE' },
    { label: 'equal to', value: 'EQ' },
    { label: 'does not equal', value: 'NE' },
    { label: 'between', value: 'BE' }
  ];


  get isBetween(){
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
    this.value = event.detail.value 
    this.updateSelection();
  }

  handleStart(event) { 
    this.start = event.detail.value 
    this.updateSelection();
  }

  handleEnd(event) { 
    this.end = event.detail.value 
    this.updateSelection();
  }

  updateSelection(){
    // Bubble event up to parent
    const selectEvent = new CustomEvent('selection', { 
      detail: { 
        name: this.name,
        selection: this.selectOption, 
        value: this.value,
        start: this.start,
        end: this.end
    }});
    this.dispatchEvent(selectEvent);
  }
}
