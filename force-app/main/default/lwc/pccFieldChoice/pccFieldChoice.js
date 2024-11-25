/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off", @lwc/lwc/no-api-reassignments: "off" */
/* eslint default-case: "off", no-return-assign: "off" */

import { LightningElement, api, wire } from 'lwc';
import { getDataset, getDatasetVersion, executeQuery } from 'lightning/analyticsWaveApi';

export default class pccFilterChoice extends LightningElement {
  /********************************************************************
   *  Bubbles Up:
   *    "selection" event with { filters: { fieldName, type }, columns: { fieldName, type }}
   *
   *  Input List:
   */

  @api dsId; //  SFDC ID of the datasetto be queried
  @api dsVersionId; //  SFDC ID of the version of the dataset to be queried
  @api defaultFilters;
  @api defaultColumns;

  /*********************************************************************
   *   Class variables:
   */

  showFilterSort = false;
  showColumnSort = false;
  showLabelSort = false;
  showTypeSort = false;
  showDescriptionSort = false;
  sortIcon = 'utility:arrowup';

  filterMap = {}; //  List of all the fields available to be filtered on: { name, label, type }
  filterChoices = []; //  List of all the fields the user has selected
  searchTerm = '';
  sortDirection = 'asc';
  sortedBy;
  isFilter = {};
  isColumn = {};
  columnOrder = [];
  
  /**
   *  Query the XMD for the dataset in question to load all the fields into the filterMap collection
   *
   */

  @wire(getDatasetVersion, { datasetIdOrApiName: '$dsId', versionId: '$dsVersionId' })
  onGetDatasetVersion({ data, error }) {
    if (error) {
      console.log(`getDatasetVersion() ERROR:`, error);
    } else if (data) {
      this.filterMap = {};
      var dateList = new Array();
      var dateLabels = {};
      var dates = data.xmdMain.dates;
      for (let i = 0; i < dates.length; i++) {
        var dateName = dates[i].fields.day;
        dateName = dateName.substr(0, dateName.length - 4);
        dateList.push(dateName);
        dateLabels[dateName] = dates[i].label;
      }
      data.xmdMain.dimensions.forEach((dim) => this.addField(dim.field, dim.label, 'Dimension', dateList));
      data.xmdMain.measures.forEach((mea) => this.addField(mea.field, mea.label, 'Measure', dateList));
      dateList.forEach((date) => this.addField(date, dateLabels[date], 'Date', dateList));

      this.defaultFilters.forEach((item) => this.isFilter[item.fieldName] = true);
      this.defaultColumns.forEach((item) => this.isColumn[item.fieldName] = true);
      this.columnOrder = this.defaultColumns.map((item) => item.fieldName);
      this.updateSelection();
    }
  }

  addField(name, label, type, dateList) {
    var isDate = false;
    for (let j = 0; j < dateList.length; j++) {
      if (name.startsWith(dateList[j])) {
        isDate = true;
      }
    }
    if ((!isDate || type == 'Date') && label != '') {
      this.filterMap[name] = { label: label, name: name, type: type };
      this.isFilter[name] = false;
      //console.log('Loading field: ' + label);
    }
  }

  columns = [
    { label: 'Label', fieldName: 'label', sortable: true },
    { label: 'Type', fieldName: 'fieldType', sortable: true }
  ];

  get selectedFields() {
    var selected = [];
    this.columnOrder.forEach((name) => {
      selected.push({ fieldName: name, type: this.filterMap[name].type, label: this.filterMap[name].label });
    });
    return selected;
  }

  //  Returns a list of fields to be used in the filter map.

  get fields() {
    var list = [];
    var pair = 'filterTableOdd';
    Object.values(this.filterMap).forEach((item) => {
      var type = '';
      switch (item.type) {
        case 'Dimension':
          type = 'Text';
          break;
        case 'Measure':
          type = 'Number';
          break;
        case 'Date':
          type = 'Date';
          break;
      }

      var name = item.name;
      if (this.searchTerm == '' || (item.label && item.label.toLowerCase().includes(this.searchTerm.toLowerCase()))) {
        list.push({ label: item.label, fieldType: type, name: name, isFilter: this.isFilter[name], isColumn: this.isColumn[name], description: this.descriptions[name] ?? '' });
      }
    });
    var sortedBy = this.sortedBy;
    if (sortedBy) {
      list.sort((a, b) => {
        if (this.sortDirection == 'asc') {
          if (a[sortedBy] > b[sortedBy]) return 1;
          if (a[sortedBy] < b[sortedBy]) return -1;
          return 0;
        }
        if (a[sortedBy] > b[sortedBy]) return -1;
        if (a[sortedBy] < b[sortedBy]) return 1;
        return 0;
      });
    }

    // Darken every other row
    list.forEach((item) => {
      item.class = pair;
      pair = pair == 'filterTableOdd' ? 'filterTableEven' : 'filterTableOdd';
    });
    return list;
  }

  handleMoveUp(event) {
    var fieldName = event.target.fieldName;
    var newList = [...this.columnOrder];
    for (let i = 1; i < this.columnOrder.length; i++) {
      var field = newList[i];
      if (field == fieldName) {
        var swap = newList[i - 1];
        newList[i - 1] = field;
        newList[i] = swap;
        i = this.columnOrder.length;
      }
    }
    this.columnOrder = newList;
    this.updateSelection();
  }

  handleMoveDown(event) {
    var fieldName = event.target.fieldName;
    var newList = [...this.columnOrder];
    for (let i = 0; i < this.columnOrder.length - 1; i++) {
      var field = newList[i];
      if (field == fieldName) {
        var swap = newList[i + 1];
        newList[i + 1] = field;
        newList[i] = swap;
        i = this.columnOrder.length;
      }
    }
    this.columnOrder = newList;
    this.updateSelection();
  }

  handleDelete(event) {
    var fieldName = event.target.fieldName;
    var newList = [];
    this.columnOrder.forEach((field) => {
      if (field != fieldName) {
        newList.push(field);
      }
    });
    this.columnOrder = newList;
  }

  handleSearch(event) {
    this.searchTerm = event.target.value;
  }

  handleSort(event) {
    var target = event.currentTarget;
    var fieldName = target.id.split('-')[0];
    var sdir = 'asc';
    if (this.sortedBy == fieldName) {
      sdir = this.sortDirection == 'asc' ? 'desc' : 'asc';
    }
    this.sortDirection = sdir;
    this.sortedBy = fieldName;
    console.log(`${fieldName}-${sdir}`);
    this.handleMouseEnter(event);
  }

  handleFilter(event) {
    var fieldName = event.currentTarget.dataset.fieldName;
    this.isFilter[fieldName] = event.detail.checked;
    this.updateSelection();
  }

  handleColumn(event) {
    var fieldName = event.currentTarget.dataset.fieldName;
    this.isColumn[fieldName] = event.detail.checked;
    this.updateSelection();
  }

  updateSelection() {
    var filterList = Object.keys(this.isFilter)
      .filter((name) => this.isFilter[name] && this.filterMap[name])
      .map((name) => ({ fieldName: name, type: this.filterMap[name].type, label: this.filterMap[name].label }))
    var cList = Object.keys(this.isColumn)
      .filter((name) => this.isColumn[name] && this.filterMap[name])
      .map((name) => ({ fieldName: name, type: this.filterMap[name].type, label: this.filterMap[name].label }))

    this.columnOrder = this.columnOrder.filter((name) => this.isColumn[name]);
    this.columnOrder = this.columnOrder.concat(Object.keys(this.isColumn).filter((name) => !this.columnOrder.includes(name)));
    var columnList = [];
    this.columnOrder.forEach((item) => {
      cList.forEach((field) => {
        if (field.fieldName == item) {
          columnList.push(field);
        }
      });
    });

    const selectEvent = new CustomEvent('selection', {
      detail: {
        filters: filterList,
        columns: columnList
      }
    });
    this.dispatchEvent(selectEvent);
  }

  handleMouseEnter(event) {
    var col = event.currentTarget.id.split('-')[0];
    var sdir = 'asc';
    if (this.sortedBy == col) {
      sdir = this.sortDirection == 'asc' ? 'desc' : 'asc';
    }
    this.sortIcon = this.sortDirection == 'asc' ? 'utility:arrowup' : 'utility:arrowdown';
    switch (col) {
      case 'label':
        this.showLabelSort = true;
        break;
      case 'fieldType':
        this.showTypeSort = true;
        break;
      case 'description':
        this.showDescriptionSort = true;
        break;
      case 'filter':
        this.showFilterSort = true;
        break;
      case 'column':
        this.showColumnSort = true;
        break;
    }
  }

  handleMouseLeave(event) {
    var col = event.currentTarget.id.split('-')[0];
    switch (col) {
      case 'label':
        this.showLabelSort = false;
        break;
      case 'fieldType':
        this.showTypeSort = false;
        break;
      case 'description':
        this.showDescriptionSort = false;
        break;
      case 'filter':
        this.showFilterSort = false;
        break;
      case 'column':
        this.showColumnSort = false;
        break;
    }
  }

  descriptions = {
    Snapshot_Date: 'The data as of date',
    Snapshot_Date_Text: 'The data as of date',
    Snapshot_Date_Key: 'Used for joining tables',
    Snapshot_Year: 'The year of the data as of date',
    Snapshot_Month: 'The month of the data as of date',
    Prior_Month_Snapshot: 'The last day of the most recently completed month',
    MCIC_Claim_Number__c: '​The number assigned to a claim that serves as an unique identifier for the claim.',
    Name: 'The Primary Claimant Name and Claim number',
    Claim__c: 'Used for joining tables',
    MCIC_Status__c: '​Description identifying the current status of the Case, i.e.- Open, Resolved, Closed.',
    Prior_Month_MCIC_Status__c: 'Status the claim was in the month prior',
    MCIC_Case_Type__c: "​Description identifying the current type or state of a claim as either  Claim, Suit or Event. In Riskonnect, this is synonymous with'Claim Type'.",
    Coverage_Major__c: '​The coverage part in the MCIC policy under which coverage is being provided for the claim.  For example, PL, GL or AE.',
    MCIC_Risk_Pool__c: '​Indicates the risk pool under which Insured is covered, either Separate or Shared.',
    Policy_Layer_Group:
      '​Grouping of Primary, Buffer, High Self Insured, and Hybrid policy layers.  This group excludes Reinsurance policy layer.  (Primary, Buffer, Hybrid, High self insured).',
    Policy_Origin_Code__c: '​The code that indicates where the policy originated.(MCIC, LPT).',
    MCIC_Error_Date__c__Year: 'Year of the date of loss',
    MCIC_Error_Date__c:
      '​The (1) earliest date that the negligent act or omission is alleged to have been committed by an insured or (2) the date that an Occurrence is alleged to have occurred in connection with a claim.',
    Claim_Limit__c: 'The maximum reserve amount per claim in the primary layer of the insurance policy.',
    MCIC_Date_of_Resolution__c: '​The date that the claim was resolved in its entirety as to all MCIC insureds involved in the claim.',
    Node_Name__c: 'Entity name',
    MCIC_AMC_Node_Formula__c: 'Academic Medical Center',
    Date_of_Loss__c:
      '​The earliest date of the following that the Risk Manager or Legal Department (or equivalent thereof)of the related Named Insured in an MCIC policy or any other person or organization listed in an endorsement to such policy titled "Claims Reporting Persons or Organizations" first (1) receives written notice of a written demand against any insured for damages or of a civil adjudicatory proceeding against any insured seeking damages commenced by service of a complaint or summons; (2) receives notice that an oral demand has been made against any insured for damages; (3) provides written notice to MCIC of an Incident by entering the required information in MCIC’s claims information system; or (4) decides to incur Non-Party Deposition Expenses.',
    Involved_Departments_Primary__c: "The MAIN service/department responsible for the patient's care at the time of the alleged injury occurred",
    Retained: '?',
    'Group.Retained': '?',
    Premium_Entity_Node_Name: '?',
    MCIC_Policy_Year__c: 'Year of the insurance policy, usually same as year claim made',
    Total_Incurred: 'Indemnity plus expense incurred',
    Total_Ind_Incurred: 'Indemnity oustanding plus indemnity paid',
    Total_Exp_Incurred: 'Expense outstanding plus expense paid',
    Incurred__c: 'Outstanding plus paid',
    MTD_Incurred: 'Month to date incurred',
    YTD_Incurred: 'Year to date incurred',
    Month_Actuarial_Estimate_Amount: 'Incurred growth expected over a complete cycle of an accounting period',
    Annual_Actuarial_Estimate_Amount: '?',
    Month_Calendar_Estimate_Amount: '?',
    Annual_Calendar_Estimate_Amount: '?',
    MCIC_High_Severity_Claim_Type__c: 'Type of high severity claim, for example: death, visual impairment, brain damage, disfigurement, paralysis, extremity loss',
    MCIC_Primary_Cause_of_Loss__c: 'The description for the reason the incident occurred'
  };
}
