/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off" */
/* eslint no-return-assign: "off" */

import { LightningElement, api, wire } from 'lwc'
import { executeQuery } from 'lightning/analyticsWaveApi'

export default class PccMultiSelectPicklist extends LightningElement {
  // API Variables

  @api dsId //  SFDC ID of the datasetto be queried
  @api dsVersionId //  SFDC ID of the version of the dataset to be queried
  @api fieldName //  API name of the field we are querying
  @api title //  Title of the widget

  valuesLength = 200 //  Number of records to load at one time
  moreThanVL

  showDropdown    //  flag used to indicate of the dropdown should be shown
  searchTerm      //  string to search values for
  searchTermQuery //  string to update SAQL to search for
  allValues       //  list of values available
  isSelected = {};     //  map of values selected, true = selection, false = un-selection
  
  //  Variables used by the HTML for iteration
  dropdownValues  //  searched-against values to display in dropdown { name, isChecked, selectKey }
  selectedValues  //  values selected for pill presentation { name, pillKey }

  mouse //  flag for showing/hiding dropdown
  blur //  flag for showing/hiding dropdown
  focus //  flag for showing/hiding dropdown

  //  Initialize the state of variables
  connectedCallback() {
    this.showDropdown = false;
    this.searchTerm = '';
    this.searchTermQuery = '';
    this.allValues = [];
    //this.isSelected = {};
    this.dropdownValues = [];
    this.selectedValues = [];
    this.moreThanVL = false;
  }

  get itemCounts() {
    var length = Object.keys(this.selectedValues).filter((name) => this.selectedValues[name]).length
    if (length == 0) {
      return 'None selected'
    }
    return `${length} items selected`
  }

  get queryString() {
    if (this.dsId) {
      var saql = `q = load "${this.dsId}/${this.dsVersionId}";`
      if (this.searchTermQuery.length > 1) {
        saql += ` q = filter q by '${this.fieldName}' matches "${this.searchTermQuery}";`
      }
      saql += ` q = group q by '${this.fieldName}'; q = foreach q generate '${this.fieldName}' as value; q = order q by value; q = limit q ${this.valuesLength};`
      return { query: saql }
    }
    return undefined
  }

  @wire(executeQuery, { query: '$queryString' })
  onExecuteQuery({ data, error }) {
    if (error) {
      console.log(`getDataset() ERROR: ` + JSON.stringify(error));
    }
    if (data) {
      console.log('Executing query: ' + this.queryString);
      this.allValues = [];
      data.results.records.forEach((item) => {
        var name = item.value;
        this.allValues.push(name);
        this.isSelected[name] = this.isSelected[name] ?? false;
      })
      if (!this.moreThanVL && this.allValues.length == this.valuesLength) {
        this.moreThanVL = true
      }
      this.updateSelection();
    }
  }

  updateSelection(){
    this.dropdownValues = this.allValues
      .filter((name) => name.includes(this.searchTerm))
      .map((name) => ({ name: name, isChecked: this.isSelected[name], selectKey: `select-${this.fieldName}-${name}`}));
    this.selectedValues = Object.keys(this.isSelected)
      .filter((name) => this.isSelected[name])
      .map((name) => ({ name: name, pillKey: `pill-${this.fieldName}-${name}`}));

    const selectEvent = new CustomEvent('selection', { 
      detail: { 
        name: this.fieldName,
        selection: this.selectedValues.map((item) => item.name)
    }});
    this.dispatchEvent(selectEvent);
  
  }

  //  Box has been checked or un-checked
  handleSelection(event) {
    var name = event.target.value
    this.isSelected[name] = this.isSelected[name] ?? false ? false : true
    this.updateSelection();
  }

  handleRemove(event){
    var name = event.detail.name;
    this.isSelected[name] = false;
    this.updateSelection();
  }

  handleSelectAll(event) {
    event.preventDefault();
    this.dropdownValues.forEach((item) => {
      this.isSelected[item.name] = true;
    });
    this.updateSelection();
  }

  handleClearAll(event) {
    event.preventDefault();
    Object.keys(this.isSelected).forEach((name) => this.isSelected[name] = false);
    this.updateSelection();
  }

  //this function is used to filter/search the dropdown list based on user input
  handleSearch(event) {
    this.searchTerm = event.target.value;
    this.showDropdown = true;
    this.mouse = false;
    this.focus = false;
    this.blurred = false;
    if (this.moreThanVL) {
      if (this.searchTerm.length > 1){
        this.searchTermQuery = this.searchTerm;
      } else if (this.searchTermQuery != ''){
        this.searchTermQuery = '';
      }
    }
  }

  handleSearchClick(event) {
    this.mouse = false
    this.showDropdown = true
  }

  //custom function used to close/open dropdown picklist
  handleMouseLeave(event) {
    this.mouse = true
    this.dropdownclose()
  }

  //custom function used to close/open dropdown picklist
  handleBlur(event) {
    this.blurred = true
    this.dropdownclose()
  }

  //custom function used to close/open dropdown picklist
  handleFocus(event) {
    this.focus = true
  }

  //custom function used to close/open dropdown picklist
  dropdownclose() {
    if (this.mouse == true && this.blurred == true && this.focus == true) {
      this.showDropdown = false;
      this.searchTerm = '';
    }
  }
}
