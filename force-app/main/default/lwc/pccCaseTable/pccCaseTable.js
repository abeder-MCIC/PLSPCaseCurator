/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off", default-case: "off", @lwc/lwc/no-api-reassignments: "off" */
import { LightningElement, api } from 'lwc';

export default class PccCaseTable extends LightningElement {
  @api chosenColumns; //  Array passed from parent component, list of column fields: [ { name, label, type } ]
  @api newCaseData; // Array of Objects passed from parent component, in String format
  @api updatedSelections; // Array of case numbers representing an update from another component
  @api clearExisting;  //  true/false flag to indicate if the current set of case data should be cleared when new data is provided
  @api clearTo;  //  list of cases to clear all data except for
  @api selectAllOnLoad = false;
  @api resultLimit;

  clearToStage = "[]";
  updatedSelectionsStage = "{}";
  newCaseDataStage = "[]" // Most-recently-parsed new data update from newCaseData, in String format
  caseData = [];  //  Persistant storage of data displayed in case table
  isSelected = {};  // Map of case numbers with true/false selections
  defaultSortDirection = 'asc'; // default sort direction
  sortDirection = 'asc'; //  flag used to track current sort direction
  sortedBy; //  name of the field currently sorted by


  connectedCallback(){
    const isLoaded = new CustomEvent('loaded', { detail: { } });
    this.dispatchEvent(isLoaded);
  }

  renderedCallback(){
    if (this.selectAllOnLoad){
      this.handleRowSelection({ detail: { config: { action: 'selectAllRows' } } });
      this.selectAllOnLoad = false;
      this.updatedSelections = "{}";
    }

  }

  /**********************************************************************************
   *  Return chosenColumns mapped to proper lightning-datatable format
   */

  get columns() {
    var columnList = [];
    if (this.chosenColumns) {
      //console.log(this.chosenColumns);
      //var columns = JSON.parse(this.chosenColumns);
      var columns = this.chosenColumns;
      if (Array.isArray(columns)) {
        columns.forEach((item) => {
          var column = { fieldName: item.fieldName, label: item.label, sortable: true };
          switch (item.type) {
            case 'Measure':
              column.type = 'number';
              break;
            case 'Date':
              column.type = 'date-local';
              column.typeAttributes = { month: '2-digit', day: '2-digit' };
              break;
            default:
              column.type = 'text';
              break;
          }
          columnList.push(column);
        });
      }
    }
    return columnList;
  }

  /**********************************************************************************
   *  Called every time the updatedSelections value is changed from the parent
   */

  get selectedRows(){
    if (this.updatedSelections && this.updatedSelections != this.updatedSelectionsStage){
      this.updatedSelectionsStage = this.updatedSelections;
      var updatedSelections = JSON.parse(this.updatedSelections);
      if (updatedSelections.selections){
        updatedSelections.selections.forEach((item) => { this.isSelected[item] = true });
      }
      if (updatedSelections.deselections){
        updatedSelections.deselections.forEach((item) => { this.isSelected[item] = false });
      }
    }
    return Object.keys(this.isSelected).filter((item) => this.isSelected[item]);
  }

  /**********************************************************************************
   *  Function used to sort column data
   */

  sortBy(field, reverse, primer) {
    const key = primer
      ? function (x) {
          return primer(x[field]);
        }
      : function (x) {
          return x[field];
        };

    return function (a, b) {
      a = key(a);
      b = key(b);
      return reverse * ((a > b) - (b > a));
    };
  }

   /**********************************************************************************
   *  Event handler for sorting by a specific column (event.detail.fieldName)
   */
 
  onHandleSort(event) {
    const { fieldName: sortedBy, sortDirection } = event.detail;
    this.sortDirection = sortDirection;
    this.sortedBy = sortedBy;

    if (this.caseList.length == this.resultLimit){
      //  Send event to parent pccCaseSearch component to update SAQL as needed
      const orderByEvent = new CustomEvent('orderby', { bubbles : true, composed : true, detail: { orderBy: sortedBy, orderDir: sortDirection } });
      this.dispatchEvent(orderByEvent);
    }
  }

  get caseList(){

    //  Check to see if we need to clear un-selected cases
    if (this.clearTo && this.clearTo != this.clearToStage){
      this.clearToStage = this.clearTo;
      var saveList = JSON.parse(this.clearTo);
      this.caseData = this.caseData.filter((item) => saveList.includes(item.id));
    }

    //  Check to see if there is new data to load
    if (this.newCaseData && this.newCaseDataStage != this.newCaseData){
      this.newCaseDataStage = this.newCaseData;
      var newCaseList = JSON.parse(this.newCaseData);
      if (this.clearExisting == true){
        this.caseData = newCaseList;
      } else {
        var newCaseNumbers = newCaseList.map((item) => item.id);
        this.caseData = this.caseData.filter((item) => !newCaseNumbers.includes(item.id)).concat(newCaseList);
        }
    }

    const cloneData = [...this.caseData];
    cloneData.sort(this.sortBy(this.sortedBy, this.sortDirection === 'asc' ? 1 : -1));

    cloneData.forEach((c) => {
      this.minRecord = c.row_number < this.minRecord ? c.row_number :  this.minRecord;
      this.maxRecord = c.row_number > this.maxRecord ? c.row_number :  this.maxRecord;
    });

    return cloneData;
  }

   /**********************************************************************************
   *  Performs a DIFF on the currently-selected data elements and passes 
   *   oncaseselection and oncasedeselection events to parent component
   */

   @api handleRowSelection(event) {
    var selections = [];
    var deselections = [];
    var num = event.detail.config.value;
    switch (event.detail.config.action) {
      case 'selectAllRows':
        this.caseData.map((item) => item.id).forEach((name) => {
          this.isSelected[name] = true;
          selections = selections.concat(this.caseData.filter((item) => item.id == name));
        });
        
        break;
      case 'deselectAllRows':
        Object.keys(this.isSelected).forEach((name) => {
          this.isSelected[name] = false;
          deselections.push(name);
        });
        break;
      case 'rowSelect':
        this.isSelected[num] = true;
        selections = selections.concat(this.caseData.filter((item) => item.id == num));
        break;
      case 'rowDeselect':
        this.isSelected[num] = false;
        deselections.push(num);
        break;
      default:
        break;
    }

    var timeOut = 1000;

    if (selections.length > 0 || deselections.length > 0) {
      const caseSelectEvent = new CustomEvent('caseselection', { bubbles : true, composed : true, detail: { selections: selections, deselections: deselections } });
      this.dispatchEvent(caseSelectEvent);
    }
  }
}
