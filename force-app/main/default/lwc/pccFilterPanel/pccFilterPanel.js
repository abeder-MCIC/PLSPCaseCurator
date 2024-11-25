import { LightningElement, api, wire } from 'lwc'
import { getDataset, getDatasetVersion, executeQuery } from 'lightning/analyticsWaveApi'

export default class PccFilterPanel extends LightningElement {
  @api dsId //  SFDC ID of the datasetto be queried
  @api dsVersionId //  SFDC ID of the version of the dataset to be queried
  @api field
  values = []

  @wire(executeQuery, {
    query: ` q = load "${this.reportClaimsId}/${this.reportClaimsVersionId}";
        q = group q by '${this.field.name}';
        q = foreach q generate '${this.field.name}' as value;
        q = order q by value;`
  })
  onGetDatasetVersion({ data, error }) {
    if (error) {
      console.log(`getDatasetVersion() ERROR:`, error);
    } else if (data) {
      this.values = [];
      data.results.records.forEach((record) => this.values.push(record.value));
    }
  }
}
