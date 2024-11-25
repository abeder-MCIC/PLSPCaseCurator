import { LightningElement, api } from 'lwc';

export default class PccCaseTableCustom extends LightningElement {
    @api chosenColumns; //  Array passed from parent component, list of column fields: [ { fieldName, label, type } ]
    @api newCaseData; // Array of Objects passed from parent component, in String format
    @api updatedSelections; // Array of case numbers representing an update from another component
    @api clearExisting;  //  true/false flag to indicate if the current set of case data should be cleared when new data is provided
    @api clearTo;  //  list of cases to clear all data except for
    @api selectAllOnLoad = false;
    @api resultLimit;

    sortName;
    sortDir;
    caseLength;
    selectedRow = -1;
    selected = {};
    rows;

    get columnList(){
      var columns = [];
      this.chosenColumns.forEach((c) => {
        var column = {...c};
        if (column.fieldName === this.sortName){
          column.showUp = this.sortDir === "asc";
          column.showDown = this.sortDir === "desc";
        }
        columns.push(column);
      });
      return columns;
    }

    get caseList(){
      var caseData = JSON.parse(this.newCaseData);
      var cl = [];
      var odd = true;
      var d;

      this.rows = {};
      this.caseLength = caseData.length;
      if (caseData){
        caseData.forEach((c) => {
          var cols = [];
          var rec = {id: c.id, value: cols};

          this.selected[c.id] = this.selected[c.id] ?? false;
          rec.checkbox = "check" + c.id;
          rec.class = odd ? "oddRow" : "evenRow";
          rec.class = rec.id === this.selectedRow ? "selectedRow" : rec.class;
          rec.selected = this.selected[c.id];
          rec.url = `../r/Claim__c/${c.link}/view`;
          odd = odd ? false : true;
          cl.push(rec);
          this.rows[c.id] = rec;
          this.chosenColumns.forEach((column) => {
            var val = c[column.fieldName];
            if (column.type === "Date"){
              d = new Date(val);
              val = d.toLocaleDateString();
            }
            val = val === "Null" ? " " : val;
            cols.push({columnKey: c.id + column.fieldName, value: val});
          });
        });
        return cl;
      }
      return undefined;
    }

    handleSort(event){
      var column = event.target.dataset.column;

      if (column === this.sortName){
        this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      } else {
        this.sortDir = "asc";
      }
      this.sortName = column;
      console.log(JSON.stringify(event.target.dataset));
    }

    selectRow(event){
      var rowId = event.target.dataset.rowid;
      this.selectedRow = rowId;
    }
    deselectRow(event){
      var rowId = event.target.dataset.rowid;
      if (rowId === this.selectedRow){
        this.selectedRow = -1;
      }
    }
    handleClick(event){
      var rowId = event.currentTarget.dataset.rowid;
      var record = this.rows[rowId];
      //var domObj = this.template.querySelector(`${record.checkbox}`);
      var domObj = this.template.querySelector(`[data-id="${record.checkbox}"]`);
      this.selected[rowId] = this.selected[rowId] ? false : true;
      domObj.checked = this.selected[rowId];
    }
  }