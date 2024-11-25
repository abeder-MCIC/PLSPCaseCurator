/* eslint no-mixed-spaces-and-tabs: "off", no-unused-vars: "off", eqeqeq: "off", vars-on-top: "off", array-callback-return: "off", default-case: "off", @lwc/lwc/no-api-reassignments: "off" */
import { LightningElement, api } from 'lwc';
import pccSaveModal from 'c/pccSaveModal';
import pccLoadModal from 'c/pccLoadModal';

export default class PccSave extends LightningElement {
    @api caseNumbers; // List of case numbers to save

    async handleSave(event){
        const result = await pccSaveModal.open({caseNumbers: this.caseNumbers, label: 'Save Case List'});
    }

    async handleLoad(event){
        const result = await pccLoadModal.open({label: 'Load Case List'});
        //console.log(JSON.stringify(result));
        const numbersEvent = new CustomEvent('casenumbers', { detail: { caseNumbers: result } });
        this.dispatchEvent(numbersEvent);
    }
}