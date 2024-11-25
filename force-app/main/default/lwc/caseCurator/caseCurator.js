import { LightningElement, wire, api } from 'lwc';
import { getDataset, getDatasetVersion, executeQuery } from "lightning/analyticsWaveApi";
import CaseCuratorFilterModal from "c/caseCuratorFilterModal";

export default class CaseCurator extends LightningElement {
  value = [];
  @api allFields = new Object();
  @api optionsFilters;
  @api selectedFilters = [];  //  Array of objects representing all the filters chosen by the yser
  @api reportClaimsName = "Report_Claims";
  @api reportClaimsId;
  @api reportClaimsVersionId;
  @api filterValues = {};
  @api filterButtonEnabled = false;
  @api discreteProgress = 100;
  @api discreteProgressVisible = false;
  fieldToDiscrete;
  toDiscrete = [];
  totalDiscrete = 0;
  selectedFilterList = [];
  selectedFieldList = [];
  valuesLength = 100;
  freeText = [];

  //@wire(getDatasets, {    datasetTypes: ["Default", "Live"],    licenseType: "EinsteinAnalytics",    pageSize: 200,    q: "Report"})
  @wire(getDataset, { datasetIdOrApiName: "$reportClaimsName" })
  onGetDataset({ data, error }) {
    if (error) {
      console.log(`getDataset() ERROR:`, error);
    } else if (data) {
      this.reportClaimsId = data.id;
      this.reportClaimsVersionId = data.currentVersionId;
    }
  }

  handleSearch(event){
    var saql = "";
    Object.keys(this.filterValues).forEach((name) => {
      var filter = {};
      this.selectedFilters.forEach((item) => {
        if (item.name == name){
          filter = item;
        }
      });
      var value = this.filterValues[name];
      if (filter.isDimension){
        saql += "q = filter q by '" + name + '\' in ["' + value.value.join('","') + '"];\n';
      } else if (filter.isMeasure){
        switch (this.filterValues[name].selection){
        case "GT":
          saql += `q = filter q by '${name}' > ${value.value}\n`;
          break;
        case "LT":
          saql += `q = filter q by '${name}' < ${value.value}\n`;
          break;
        case "GE":
          saql += `q = filter q by '${name}' >= ${value.value}\n`;
          break;
        case "LE":
          saql += `q = filter q by '${name}' <= ${value.value}\n`;
          break;
        case "EQ":
          saql += `q = filter q by '${name}' == ${value.value}\n`;
          break;
        case "NQ":
          saql += `q = filter q by '${name}' != ${value.value}\n`;
          break;
        case "BE":
          saql += `q = filter q by '${name}' between ${value.start} and ${value.end}\n`;
          break;
        }
        
      }
    });
    console.log(saql);
  }

  get filterButtonDisabled() {
    return !this.filterButtonEnabled;
  }

  get discreteQuery() {
    if (this.fieldToDiscrete && this.reportClaimsId) {
      return {
        query: this.getDiscreteSAQL(this.fieldToDiscrete) + `q = limit q ${this.valuesLength};`
      };
    }
  }

  getDiscreteSAQL(fieldName){
    return ` q = load "${this.reportClaimsId}/${this.reportClaimsVersionId}";
             q = group q by '${fieldName}';
             q = foreach q generate '${fieldName}' as value;
             q = order q by value;`;
  }

  @wire(executeQuery, { query: '$discreteQuery' })
  onGetDiscrete({ data, error }) {
    if (error) {
      console.log(`getDatasetVersion() ERROR:`, error);
    } else if (data) {
      var name = this.fieldToDiscrete;
      console.log('Values for: ' + name);
      var list = [];
      for (let i = 0; i < data.results.records.length; i++) {
        list.push(data.results.records[i].value);
      }
      this.allFields[name].values = list;
      var remaining = this.toDiscrete.length / this.totalDiscrete;
      this.discreteProgress = 100 - (remaining * 100);
      if (this.toDiscrete && this.toDiscrete.length > 0) {
        this.fieldToDiscrete = this.toDiscrete.pop();
        console.log('Setting discrete to: ' + this.fieldToDiscrete);
      } else {
        this.setselectedFilterList();
        this.discreteProgressVisible = false;
      }
    }
  }

  setselectedFilterList() {
    this.selectedFilters = new Array();
    //this.selectedFilterList.forEach(function(name) {
    for (let i = 0; i < this.selectedFilterList.length; i++) {
      var name = this.selectedFilterList[i];
      var field = this.allFields[name];
      var label = field.label;
      var options = new Array();
      var optionList = new Array();
      var values = field.values;
      var isDimension = field.type == 'Dimension';
      var isMeasure = field.type == 'Measure';
      if (isDimension){
        options.push({ label: 'All Values', value: 'in all' });
        for (let j = 0; j < values.length; j++) {
          options.push({ label: values[j], value: '== \'' + values[j] + '\'' });
          optionList.push(values[j]);
        }
      }
      //debugger;
      var thisFilter = {
        name: name, label: label, options: options,
        isDimension: isDimension, isMeasure: isMeasure, isBetween: false,
        optionList: optionList, selection: [], query: `q = load "${this.reportClaimsId}/${this.reportClaimsVersionId}";`
      };
      this.selectedFilters.push(thisFilter);
      console.log('Created selected filter for: ' + JSON.stringify(thisFilter));
      if (isDimension) {
        this.filterValues[name] = { value: [] };
      } else if (isMeasure) {
        this.filterValues[name] = { type: "", value: 0, start: 0, end: 0 };
      }
    }
  }

  handleChecks(event){
    this.freeText = event.detail.value;
    debugger;
  }

  getSearchSAQL(){
    var saql = `q = load "${this.reportClaimsId}/${this.reportClaimsVersionId}";`
    for (let i = 0;i < this.selectedFilters.length;i++){

    }
    return saql;
  }

  handleDimensionSelection(event){
    var name = event.detail.name;
    var selection = event.detail.selection.map((profile) => profile.Name );
    //debugger;
    this.filterValues[name].value = selection;
  }

  handleMeasureSelection(event){
    var name = event.detail.name;
    this.filterValues[name].selection = event.detail.selection;
    this.filterValues[name].start = event.detail.value;
    this.filterValues[name].end = event.detail.value;
    this.filterValues[name].value = event.detail.value;
  }

  /*
   setselectedFilterList() {
    //this.selectedFilters = new Array();
    //this.selectedFilterList.forEach(function(name) {
    for (let i = 0; i < this.selectedFilterList.length; i++) {
      var name = this.selectedFilterList[i];
      var exists = false;
      for (let j = 0; j < this.selectedFilters.length; j++) {
        if (name == this.selectedFilters[j].name) {
          exists = true;
        }
      }
      if (!exists) {
        var field = this.allFields[name];
        var label = field.label;
        var options = new Array();
        var optionList = new Array();
        var values = field.values;
        var isDimension = field.type == 'Dimension';
        var isMeasure = field.type == 'Measure';
        if (isDimension){
          options.push({ label: 'All Values', value: 'in all' });
          for (let j = 0; j < values.length; j++) {
            options.push({ label: values[j], value: '== \'' + values[j] + '\'' });
            optionList.push(values[j]);
          }
        }
        //debugger;
        var thisFilter = {
          name: name, label: label, options: options,
          isDimension: isDimension, isMeasure: isMeasure, isBetween: false,
          optionList: optionList, selection: []
        };
        this.selectedFilters.push(thisFilter);
        console.log('Created selected filter for: ' + JSON.stringify(thisFilter));
        if (isDimension) {
          this.filterValues[name] = { value: "" };
        } else if (isMeasure) {
          this.filterValues[name] = { type: "", value: 0, start: 0, end: 0 };
        }
      }
    }

    //  Remove any values no longer selected
    var newSelected = new Array();
    for (let i = 0; i < this.selectedFilters.length; i++) {
      field = this.selectedFilters[i];
      for (let j = 0; j < this.selectedFilterList.length; j++) {
        if (field.name == this.selectedFilterList[j]) {
          return true;
        }
      }
      return false;
    };
    debugger;
  }
*/
  async doFilterModal() {
    CaseCuratorFilterModal.open({ options: this.optionsFilters, selected: this.selectedFilterList, title: "Filters to Select" }).then((result) => {
      this.selectedFilterList = (result) ? result : [];
      //console.log(result);
      var discrete = new Array();
      for (let i = 0; i < this.selectedFilterList.length; i++) {
        var field = this.allFields[result[i]];
        if (!field.values && field.type == 'Dimension') {
          discrete.push(result[i]);
        }
      }
      this.totalDiscrete = discrete.length;
      if (discrete.length > 0) {
        this.fieldToDiscrete = discrete.pop();
        console.log('Setting discrete to: ' + this.fieldToDiscrete);
        this.toDiscrete = discrete;
        this.discreteProgress = 0;
        this.discreteProgressVisible = true;
      } else {
        this.setselectedFilterList();
      }
    });
  }

  get optionsFields() {
    return [
      { label: "Clinical Summary", value: "Clinical_Summary" },
      { label: "Description of Loss", value: "Loss_Description" },
      { label: "Claim History Summary", value: "History_Summary" }
    ]
  };

  get optionsAMC() {
    return [
      { label: "Johns Hopkins Medicine", value: "Johns Hopkins Medicine" },
      { label: "NYP/Columbia", value: "NYP/Columbia" },
      { label: "NYP/Cornell", value: "NYP/Cornell" },
      { label: "University of Rochester", value: "University of Rochester" },
      { label: "YNHHS-YSM", value: "YNHHS-YSM" }
    ]
  }

  getNextMap(list) {
    var nextMap = new Array();
    for (let i = 0; i < list.length - 1; i++) {
      var thisOne = list[i];
      var nextOne = list[i + 1];
      nextMap[thisOne] = nextOne;
    }
    return nextMap;
  }

  handleDimensionFilterChange(event) {
    if (!this.filterValues[event.detail.name]) {
      this.filterValues[event.detail.name] = {};
    }
    this.filterValues[event.detail.name].value = event.detail.value
  }
}