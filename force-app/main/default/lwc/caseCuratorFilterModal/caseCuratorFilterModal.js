import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class CaseCuratorFilterModal extends LightningModal {
    @api options;
    @api selected;
    @api title;

    get optionsFilters(){
        return this.options;
    }

    handleChange(event){
        this.selected = event.detail.value;
    }

    handleOkay() {
        this.close(this.selected);
    }
}