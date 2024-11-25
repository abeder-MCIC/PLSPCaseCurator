/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off", default-case: "off", @lwc/lwc/no-api-reassignments: "off" */
/* eslint @lwc/lwc/valid-wire: "off" */
import { api, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import getInitiatives from '@salesforce/apex/PccDAO.getInitiatives';
import getVersions from '@salesforce/apex/PccDAO.getVersions';
import getCases from '@salesforce/apex/PccDAO.getCases';

export default class PccLoadModal extends LightningModal {
  @api initiativeName;
  @api versionId;

  @wire(getInitiatives) initiativeList; // names of initiatives previously saved
  @wire(getVersions, { initiativeName: '$initiativeName' }) versionList; // names of initiatives previously saved

  get isDisabled(){
    return this.versionId == undefined;
  }


  get initiativeOptions() {
    if (this.initiativeList.data) {
      return this.initiativeList.data.map((name) => ({ label: name, value: name }));
    }
    return [];
  }

  get versionOptions() {
    if (this.versionList.data) {
      var versionList = JSON.parse(this.versionList.data);
      return versionList.map((item) => ({ label: `${item.version}: ${item.createdBy} on ${item.createdDate} ${item.active ? '(Active)' : ''}`, value: item.id }));
      //version:' + pc.Version__c + ', createdBy: ' + pc.CreatedBy.Name + ', active: ' + pc.Active__c + ', createdDate: ' + pc.CreatedDate + 
    }
    return [];
  }

  handleInitiativeChange(event) {
    this.initiativeName = event.detail.value;
  }

  handleVersionChange(event) {
    this.versionId = event.detail.value;
  }

  handleLoad(event) {
    getCases({ id: this.versionId })
      .then((result) => {
        var caseNumbers = result.split(",");
        //const numbersEvent = new CustomEvent('casenumbers', { bubbles : true, composed : true, detail: { caseNumbers: caseNumbers } });
        //this.dispatchEvent(numbersEvent);
        this.close(caseNumbers);
      })
      .catch((error) => {
        console.log('Error: ' + JSON.stringify(error));
        this.error = error;
        this.close([]);
    });
  }

  handleCancel(event) {
    this.close([]);
  }
}
