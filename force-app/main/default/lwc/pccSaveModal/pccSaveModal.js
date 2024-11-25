/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off", default-case: "off", @lwc/lwc/no-api-reassignments: "off" */
/* eslint @lwc/lwc/valid-wire: "off" */
import { api, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import getInitiatives from '@salesforce/apex/PccDAO.getInitiatives';
import getVersions from '@salesforce/apex/PccDAO.getVersions';
import saveInitiativeClaims from '@salesforce/apex/PccDAO.saveInitiativeClaims';

export default class PccSaveModal extends LightningModal {
  @api caseNumbers; // List of case numbers to save
  @api initiativeName;
  @api versionName;
  @api saveConfig;

  @wire(getInitiatives) initiativeList; // []: names of initiatives previously saved
  //@wire(getVersions, { inititiveName: '$inititiveName' }) versionList; // names of initiatives previously saved
  initiative;
  newInitiative;
  error;

  get options() {
    if (this.initiativeList.data) {
      return [{ label: 'New', value: 'new' }].concat(this.initiativeList.data.map((name) => ({ label: name, value: name })));
    }
    return undefined;
  }

  get isDisabled(){
    var enabled = true;
    enabled = enabled && this.initiative;
    enabled = enabled && (this.initiative != 'new' || this.newInitiative);
    return !enabled;
  }

  handleComboChange(event) {
    this.initiative = event.detail.value;
  }

  handleInputChange(event) {
    this.newInitiative = event.detail.value;
  }

  handleVersionChange(event) {
    this.versionName = event.detail.value;
  }

  handleSave(event) {
    var initiativeName = this.initiative == 'new' ? this.newInitiative : this.initiative;
    var versionName = this.versionName;
    if (!versionName || versionName == '') {
      versionName = new Date().toLocaleString();
    }
    this.saveConfig = { initiativeName: initiativeName, versionName: versionName, claimNumbers: this.caseNumbers.join(',') };
    saveInitiativeClaims({ wrapper: this.saveConfig })
      .then((result) => {
        console.log(result);
        this.close();
      })
      .catch((error) => {
        console.log('Error: ' + error);
        this.error = error;
      });
  }

  handleCancel(event) {
    this.close();
  }
}
