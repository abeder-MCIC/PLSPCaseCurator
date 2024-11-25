import { LightningElement, api, wire } from 'lwc';
import { getDataset, getDatasetVersion, executeQuery } from "lightning/analyticsWaveApi";

export default class FilterChoice extends LightningElement {

    @api filterList;       //  List of all the fields available to be filtered on
    @api filterChoices;    //  List of all the fields the user has selected
    @api dsId;             //  SFDC ID of the datasetto be queried
    @api dsVersionId;      //  SFDC ID of the version of the dataset to be queried

    @wire(getDatasetVersion, { datasetIdOrApiName: "$dsId", versionId: "$dsVersionId" })
    onGetDatasetVersion({ data, error }) {
      if (error) {
        console.log(`getDatasetVersion() ERROR:`, error);
      } else if (data) {
        this.optionsFilters = new Array();
        var dateList = new Array();
        var dateLabels = {};
        var dates = data.xmdMain.dates;
        for (let i = 0; i < dates.length; i++) {
          var dateName = dates[i].fields.day;
          dateList.push(dateName.substr(0, dateName.length - 4));
          dateLabels[dateName] = dates[i].label;
        }
        data.xmdMain.dimensions.forEach(((dim) => this.addField(dim.field, dim.label, 'Dimension', dateList)));
        data.xmdMain.measures.forEach(((mea) => this.addField(mea.field, mea.label, 'Measure', dateList)));
        dateList.forEach(((date) => this.addField(date, dateLabels[date], 'Date', dateList)));
        this.filterButtonEnabled = true;
      }
    }    

    addField(name, label, type, dateList) {
        var isDate = false;
        for (let j = 0; j < dateList.length; j++) {
          if (name.startsWith(dateList[j])) {
            isDate = true;
          }
        }
        if ((!isDate || type == 'Date') && label != "") {
          this.allFields[name] = { label: label, type: type };
          this.optionsFilters.push({ label: label, value: name });
          console.log('Loading field: ' + label);
        }
    }    
}