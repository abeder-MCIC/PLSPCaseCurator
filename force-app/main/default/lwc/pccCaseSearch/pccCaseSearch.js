/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off", default-case: "off", @lwc/lwc/no-api-reassignments: "off" */
import { LightningElement, wire, api } from 'lwc';
import { executeQuery, getDataset } from 'lightning/analyticsWaveApi';

export default class PccCurator extends LightningElement {
  @api chosenFilters; //  Array passed from parent component, list of filter fields: [ { name, label, type } ]
  @api chosenColumns; //  Array passed from parent component, list of column fields: [ { name, label, type } ]
  @api loadNumbers; //  Comma-delimited String passed from parent component, list of case numbers to load into application
  @api dsId;
  @api dsVersionId;
  @api updatedSelections; //  List of cases which have been deselected
  @api orderBy;
  @api orderDir;
  @api dsName;
  @api idField;
  @api numberField;

  filterMap = {}; //  Contains map of filters to apply in the format: name => { type, selection, value, start, end, inList }
  filterList = []; //  List of all the filters
  //columnList = []; //  List of all the columns
  caseList = '[]'; //  List of cases from search in String format
  isSelected = {}; //  Map of Claim Numbers with true/false if they've been selected

  freeTextFields = {};
  freeTextSearch;
  searchSelection = [];
  loadNumbersStage;
  resultLimit = 400;
  minRecord = 0;
  maxRecord = 0;
  totalRecord = 0;
  currentRecord = 1;
  showRecordCount = false;
  showNextLink = false;
  showPrevLink = false;
  fieldLengths = {};

  searchSaql; //  SAQL for searching cases in @wire object format, no projection (i.e. no foreach statement)


  get columnList() {
    return this.chosenColumns.map((item) => ({ 
      fieldName: item.fieldName, 
      label: item.label, 
      type: item.type == 'Measure' ? 'number' : 'text', 
      sortable: true,
      size: this.fieldLengths[item.fieldName] < 20 ? 2 : 3
    }));
  }

  @wire(getDataset, { datasetIdOrApiName: '$dsName' })
  onGetDataset({ data, error }) {
    if (error) {
      console.log(`getDataset() ERROR:`, error);
    } else if (data) {
      this.dsId = data.id;
      this.dsVersionId = data.currentVersionId;
      const idEvent = new CustomEvent('ids', { detail: { dsId: this.dsId, dsVersionId: this.dsVersionId } });
      this.dispatchEvent(idEvent);
    }
  }

  /**********************************************************************
   *  Called to determine character length for all dimension fields
   */

  get fieldLengthSaql() {
    if (this.dsId === undefined){
      return undefined;
    }
    var saql = `a = load "${this.dsId}/${this.dsVersionId}";\n`;
    var count = 1;
    this.chosenFilters
      .filter((filter) => filter.type == "Dimension")
      .forEach((filter) => {
        saql += `q = group a by '${filter.name}';
        q = foreach q generate len('${filter.name}') as length;
        q = group q by all;
        q${count} = foreach q generate max(length) as length, "${filter.name}" as fieldName;
        `;
      count ++;
    });

    saql += "q = union ";
    while (count > 1){
      count --;
      saql += `q${count},`
    }
    saql = saql.substring(0, saql.length - 1) + ";";
    saql += "q = group q by fieldName;"
    saql += "q = foreach q generate fieldName, max(length) as length;"

    return { query: saql };
  }

  @wire(executeQuery, { query: '$fieldLengthSaql' })
  onGetFieldLengths({ data, error }) {
    if (error) {
      console.log(`onGetFieldLengths() ERROR:`, error);
    } else if (data) {
      this.fieldLengths = {};
      data.results.records.forEach((item) => {
        var fieldName = item.fieldName;
        var length = item.length;
        this.fieldLengths[fieldName] = length;
      });
    }
  }

  /**********************************************************************
   *  Called when load dialog is executed. We're levering the search logic
   *   in order to populate the case list
   */

  get loadSaql() {
    if (this.dsId && this.loadNumbers) {
      var numbers = this.loadNumbers.split(',');
      var saql = `q = load "${this.dsId}/${this.dsVersionId}";\n`;
      saql += `q = filter q by ${this.numberField} in ["${numbers.join('","')}"];\n`;
      saql += `q = group q by ${this.numberField};\n`;
      saql += this.projectionSaql;
      return { query: saql };
    }
    return undefined;
  }

  @wire(executeQuery, { query: '$loadSaql' })
  onLoadCases({ data, error }) {
    if (error) {
      console.log(`executeQuery() ERROR:`, JSON.stringify(error));
    } else if (data) {
      this.updateCaseList(data);
      //  Select all rows
      this.template.querySelector('c-pcc-case-table').selectAllOnLoad = true;
    }
  }

  /**********************************************************************
   *  Generates SAQL and searches for case records. Responds to changes
   *    in this.searchSaql (filters) and this.columnList (column choises)
   */

  get projectedSearchSaql() {
    if (this.searchSaql) {
      var lastRecord = this.currentRecord + this.resultLimit;
      var saql = this.searchSaql;
      //var saql = `q = load "0FbTI000000SVos0AG/0FcTI000001dK1V0AU";q = filter q by 'Node_Name__c' in ["All Children's Health System, Inc."];`;
      saql += `q = group q by ${this.numberField};\n`;
      //saql += `q = group q by MCIC_Claim_Number__c;\n`;
      saql += this.projectionSaql;
      //saql += `q = foreach q generate MCIC_Claim_Number__c, first(MCIC_Claim_Number__c) as link, first('Node_Name__c') as 'Node_Name__c', first('MCIC_Case_Type__c') as 'MCIC_Case_Type__c', first('MCIC_Status__c') as 'MCIC_Status__c', first('Claim_Made_Date') as 'Claim_Made_Date', first('Date_of_Loss') as 'Date_of_Loss', first('Ind_Incurred') as 'Ind_Incurred', first('Incurred__c') as 'Incurred__c', first('Patient_Injury_Outcome_Clinical_Severity__c_bucket') as 'Patient_Injury_Outcome_Clinical_Severity__c_bucket', first('Involved_Departments_Primary__c') as 'Involved_Departments_Primary__c', first('Case_Category__c') as 'Case_Category__c', first('Allegation__c') as 'Allegation__c', first('Case_Synopsis__c') as 'Case_Synopsis__c', first('Clinical_Summary__c') as 'Clinical_Summary__c', first('ContributingFactor.Primary_Clinical_Severity_Flag') as 'ContributingFactor.Primary_Clinical_Severity_Flag', first('ContributingFactor.AdverseOutcome.Primary_Adverse_Outcome__c') as 'ContributingFactor.AdverseOutcome.Primary_Adverse_Outcome__c', row_number() over ([..] partition by all order by MCIC_Claim_Number__c asc) as row_num;q = order q by MCIC_Claim_Number__c asc;`
      saql += `q = filter q by row_num >= ${this.currentRecord} and row_num < ${lastRecord};\n`;
      return { query: saql };
    }
    return undefined;
  }

  get countSaql(){
    if (this.searchSaql) {
      var saql = this.searchSaql;
      saql += `q = group q by all;\nq = foreach q generate unique(${this.numberField}) as rec_count;`;
      return { query: saql };
    }
    return undefined;
  }

  @wire(executeQuery, { query: '$countSaql' })
  onSearchCaseCount({ data, error }) {
    if (error) {
      console.log(`executeQuery() ERROR:`, JSON.stringify(error));
    } else if (data) {
      this.totalRecord = data.results.records[0].rec_count;
      if (this.totalRecord > 0){
        this.showRecordCount = true;
      } else {
        this.showRecordCount = false;
      }
    }
  }

  @wire(executeQuery, { query: '$projectedSearchSaql' })
  onSearchCases({ data, error }) {
    if (error) {
      console.log(`executeQuery() ERROR:`, JSON.stringify(error));
    } else if (data) {
      this.updateCaseList(data);
    }
  }

  get projectionSaql() {
    //var saql = `q = foreach q generate ${this.numberField}, first(${this.idField}) as link, `;
    var saql = `q = foreach q generate MCIC_Claim_Number__c, first(${this.idField}) as link, `;
    var columnSAQL = [];
    this.columnList.forEach((field) => {
      columnSAQL.push(`first('${field.fieldName}') as '${field.fieldName}'`);
    });
    saql += columnSAQL.join(', ');
    saql += `, row_number() over ([..] partition by all order by ${this.orderByField} ${this.orderByDir}) as row_num`;
    saql += ';';

    saql += `q = order q by ${this.orderByField} ${this.orderByDir};`;

    //saql += `q = limit q ${this.resultLimit};\n`;
    return saql;
  }

  get orderByField(){
    return this.orderBy ?? this.numberField;
  }

  get orderByDir(){
    return this.orderDir ?? "asc";
  }

  handleOrderBy(event){
    var detail = event.detail;
    this.orderBy = detail.orderBy;
    this.orderDir = detail.orderDir;
  }

  /*******************************************************************************
   * Called by @wire functions which return a new set of case data searched against
   *   Parse the JSON returned, set up identified fields and save the rest of the
   *   columns according to their front-end display
   */

  updateCaseList(data) {
    var caseList = [];
    this.maxRecord = 0;
    data.results.records.forEach((item) => {
      var id = item[this.idField];
      var rowNum = item.row_num;
      var rec = { id: id, link: item.link };
      this.columnList.forEach((col) => {
        var name = col.fieldName;
        var column = this.chosenColumns.filter((x) => x.fieldName == name)[0];
        var value = item[name];
        if (column.type == 'Date') {
          value = new Date(value);
        }
        rec[name] = value;
      });
      this.maxRecord = this.maxRecord < rowNum ? rowNum : this.maxRecord;
      rec.row_number = item.row_num;
      caseList.push(rec);
      //this.isSelected[id] = this.isSelected[id] ?? false;
    });

    this.showNextLink = (this.currentRecord + this.resultLimit) < this.totalRecord;
    this.showPrevLink = this.currentRecord > 1;
    this.caseList = JSON.stringify(caseList);
    //console.log('Requerying Analytics based on search request. New case list results: ' + caseList.length);
  }

  get selectedRows() {
    this.delectedCases.forEach((num) => {
      this.isSelected[num] = false;
    });
    return Object.keys(this.isSelected).filter((number) => this.isSelected[number]);
  }

  //  Search all records based on filter parameters
  handleSearch(event) {
    var saql = `q = load "${this.dsId}/${this.dsVersionId}";\n`;
    Object.keys(this.filterMap).forEach((name) => {
      var filter = this.filterMap[name];
      if (filter.type == 'Dimension' && filter.selection && filter.selection.length > 0) {
        saql += `q = filter q by '${name}'`;
        saql += ` in ["${filter.selection.join('","')}"];\n`;
      } else if ((filter.type == 'Measure' || filter.type == 'Date') && filter.selection && filter.selection != 'ANY') {
        var value = filter.value;
        var start = filter.start;
        var end = filter.end;
        var fieldName = `'${name}'`;
        if (filter.type == 'Date') {
          value = value ? new Date(value).valueOf() / 86400000 : value;
          fieldName = `'${name}_day_epoch'`;
        }
        saql += `q = filter q by ${fieldName}`;
        switch (filter.selection) {
          case 'GT':
            saql += `> ${value};\n`;
            break;
          case 'GE':
            saql += `>= ${value};\n`;
            break;
          case 'LT':
            saql += `< ${value};\n`;
            break;
          case 'LE':
            saql += `<= ${value};\n`;
            break;
          case 'EQ':
            saql += `== ${value};\n`;
            break;
          case 'NE':
            saql += `!= ${value};\n`;
            break;
          case 'BE':
            if (filter.type == 'Date') {
              start = start ? new Date(start).valueOf() / 86400000 : start;
              end = end ? new Date(end).valueOf() / 86400000 : end;
            }
            saql += `>= ${start} and ${fieldName} <= ${end};\n`;
            break;
        }
      }
    });
    if (this.freeTextSearch && this.freeTextSearch != '') {
      var fieldList = Object.keys(this.freeTextFields).filter((name) => this.freeTextFields[name]);
      if (fieldList.length > 0) {
        var aql = fieldList.map((name) => `'${name}' matches "${this.freeTextSearch}"`).join(' or ');
        saql += `q = filter q by (${aql});\n`;
      }
    }
    this.searchSaql = saql;
  }

  // bubbled up by pcc-measure-input: { name, selection, value, start, end }
  handleMeasureSelection(event) {
    var detail = event.detail;
    var map = this.filterMap[detail.name];
    map.selection = detail.selection;
    map.value = detail.value;
    map.start = detail.start;
    map.end = detail.end;
  }

  // bubbled up by pcc-multi-select-picklist: { name, selection [] }
  handleDimensionSelection(event) {
    var detail = event.detail;
    this.filterMap[event.detail.name].selection = detail.selection;
  }

  // bubbled up by pcc-filter-choice: { fields: [ { fieldName, label, type } ] }
  get filters() {
    var oldFilterList = [...this.filterList];
    this.filterList = [];
    if (this.chosenFilters) {
      console.log(this.chosenFilters);
      //var filters = JSON.parse(this.chosenFilters);
      var filters = this.chosenFilters;
      if (Array.isArray(filters)) {
        filters.forEach((item) => {
          var name = item.fieldName;
          var field = { name: name, label: item.label, isDimension: item.type == 'Dimension', isDate: item.type == 'Date', isMeasure: item.type == 'Measure' };
          this.filterList.push(field);
          this.filterMap[name] = this.filterMap[name] ?? {};
          this.filterMap[name].type = item.type;
        });
        if (oldFilterList) {
          oldFilterList.filter((name) => !this.filterList.includes(name)).forEach((name) => delete this.filterMap[name]);
        }
      }
    }
    return this.filterList;
  }

  handleFTSCheck(event) {
    var values = event.detail.value;
    values.forEach((value) => {
      this.freeTextFields[value] = true;
    });
  }

  handleFTSValue(event) {
    this.freeTextSearch = event.detail.value;
  }

  //  Responds to child case table bubbling up caseselection, { detail: { caseList: [{}] }
  handleCaseSelection(event) {
    //var caseNumbers = this.caseNumbers.caseNumbers;
    //caseNumbers = caseNumbers.concat(event.detail.caseList.map((item) => item.id).filter((num) => !caseNumbers.includes(num)));
    this.dispatchEvent(event);
  }

  //  Responds to child case table bubbling up casedeselection, { detail: { caseNumbers: [""] }
  handleCaseDeselction(event) {
    //var caseNumbers = this.caseNumbers.caseNumbers;
    //caseNumbers = caseNumbers.filter((num) => !event.detail.caseNumbers.includes(num));
    this.dispatchEvent(event);
  }

  handleNextLink(event){
    this.currentRecord += this.resultLimit;
  }

  handlePrevLink(event){
    this.currentRecord -= this.resultLimit;
  }

  get searchFields() {
    return [
      { label: 'Description of Loss', value: 'Accident_Description__c' },
      { label: 'Description of Loss Summary', value: 'MCIC_Description_of_Loss_Summary__c' },
      { label: 'Reinsurance Summary', value: 'Claims_Reinsurance_Summary__c' },
      { label: 'Claim History Summary', value: 'Claim_History_Summary__c' },
      { label: 'Claim History Short Summary', value: 'MCIC_Claim_History_Short_Summary__c' }
    ];
  }
}
