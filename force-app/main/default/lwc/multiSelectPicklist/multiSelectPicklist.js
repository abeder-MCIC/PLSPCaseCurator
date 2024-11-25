/* eslint-disable vars-on-top */
import { LightningElement, api, track, wire } from 'lwc'
import { executeQuery } from 'lightning/analyticsWaveApi'

export default class MultiSelectPicklist extends LightningElement {
  // API Variables
  @api defaultpicklistinput = [
    'Sales Cloud',
    'Service Cloud',
    'Marketing Cloud',
    'Commerce Cloud',
    'App Cloud',
    'Einstein Analytics',
    'Community Cloud',
    'IOTCloud',
    'Force.com',
    'Salesforce For Fresher',
    'Salesforce'
  ]
  picklistinput
  selecteditems = []
  @api title
  @api query
  @api fieldname
	@api valueslength;

  // Track Variables
  @track allValues = [] // this will store end result or selected values from picklist
  @track selectedObject = false
  @track valuesVal = undefined
  @track searchTerm = ''
  @track showDropdown = false
  @track itemcounts = 'None Selected'
  @track selectionlimit = 1000
  @track showselectall = false
  @track errors
  saql
  originalPicklistInput
	
  get queryString() {
    return {
      query: this.saql
    }
  }

  @wire(executeQuery, { query: '$queryString' })
  onExecuteQuery({ data, error }) {
    if (error) {
      console.log(`getDataset() ERROR: ` + JSON.stringify(error))
    }
    if (data) {
      this.picklistinput = []
      for (let i = 0; i < data.results.records.length; i++) {
        this.picklistinput.push(data.results.records[i].value)
      }
      this.valuesVal = undefined
    }
  }

  //this function is used to show the dropdown list
  get filteredResults() {
    //copying data from parent component to local variables
    if (this.originalPicklistInput === undefined) {
      this.originalPicklistInput = this.picklistinput.map((value) => value)
    }

    if (this.valuesVal === undefined) {
      this.valuesVal = this.picklistinput
        ? this.picklistinput.map((value) => value)
        : this.defaultpicklistinput.map((value) => value)

      //below method is used to change the input which we received from parent component
      //we need input in array form, but if it's coming in JSON Object format, then we can use below piece of code to convert object to array
      Object.keys(this.valuesVal).forEach((profile) => {
        this.allValues.push({
          Id: profile,
          Name: this.valuesVal[profile],
          SelectKey: `select-${this.fieldname}-${this.valuesVal[profile]}`,
          PillKey: `pill-${this.fieldname}-${this.valuesVal[profile]}`
        })
        //console.log(`select-${this.fieldname}-${this.valuesVal[profile]}`);
      })

      this.valuesVal = this.allValues.sort(function (a, b) {
        return a.Id - b.Id
      })
      this.allValues = []

      //console.log(JSON.stringify(this.valuesVal));
    }

    if (this.valuesVal != null && this.valuesVal.length !== 0) {
      if (this.valuesVal) {
        const selectedProfileNames = this.selecteditems.map(
          (profile) => profile.Name
        )
        //console.log(JSON.stringify(selectedProfileNames));
        return this.valuesVal
          .map((profile) => {
            //below logic is used to show check mark (✓) in dropdown checklist
            const isChecked = selectedProfileNames.includes(profile.Name)
            return {
              ...profile,
              isChecked
            }
          })
          .filter((profile) => profile.Name && 
            profile.Name.toLowerCase().includes(this.searchTerm.toLowerCase())
          )
          .slice(0, 100);
      }
    }
    return undefined;
  }

  //this function is used to filter/search the dropdown list based on user input
  handleSearch(event) {
    this.searchTerm = event.target.value
    this.showDropdown = true
    this.mouse = false
    this.focus = false
    this.blurred = false
    if (this.selecteditems.length !== 0) {
      if (this.selecteditems.length >= this.selectionlimit) {
        this.showDropdown = false
      }
    }
    //Check to see if there are more values that need to be pulled
    if (this.originalPicklistInput.length === this.valueslength) {
      if (this.searchTerm.length > 1) {
        this.saql = `${this.query} 
                    q = filter q by '${this.fieldname}' matches "${this.searchTerm}";
                    q = group q by '${this.fieldname}';
                    q = foreach q generate '${this.fieldname}' as value;
                    q = order q by value;
                    q = limit q ${this.valueslength};`
      } else {
        /*
        this.picklistinput = { ...this.originalPicklistInput }
        this.valuesVal = this.picklistinput
        Object.keys(this.valuesVal).map((profile) => {
          this.allValues.push({
            Id: profile,
            Name: this.valuesVal[profile]
          })
        })
        */
        this.originalPicklistInput.forEach((item) => {
          this.allValues.push({
            Id: item,
            Name: item
          })
        })
        this.valuesVal = this.allValues.sort(function (a, b) {
          return a.Id - b.Id
        })
        this.allValues = []
      }
    }
  }

  //this function is used when user check/uncheck/selects (✓) an item in dropdown picklist
  handleSelection(event) {
    const selectedProfileId = event.target.value
    const isChecked = event.target.checked

    //if part will run if selected item is less than selection limit
    //else part will run if selected item is equal or more than selection limit
    if (this.selecteditems.length < this.selectionlimit) {
      //below logic is used to show check mark (✓) in dropdown checklist
      if (isChecked) {
        const selectedProfile = this.valuesVal.find(
          (profile) => profile.Id === selectedProfileId
        )
        if (selectedProfile) {
          this.selecteditems = [...this.selecteditems, selectedProfile]
          this.allValues.push(selectedProfileId)
        }
      } else {
        this.selecteditems = this.selecteditems.filter(
          (profile) => profile.Id !== selectedProfileId
        )
        this.allValues.splice(this.allValues.indexOf(selectedProfileId), 1)
      }
    } else {
      //below logic is used to when user select/checks (✓) an item in dropdown picklist
      if (isChecked) {
        this.showDropdown = false
        this.errormessage()
      } else {
        this.selecteditems = this.selecteditems.filter(
          (profile) => profile.Id !== selectedProfileId
        )
        this.allValues.splice(this.allValues.indexOf(selectedProfileId), 1)
        this.errormessage()
      }
    }
    this.itemcounts =
      this.selecteditems.length > 0
        ? `${this.selecteditems.length} options selected`
        : 'None Selected'

    if (this.itemcounts === 'None Selected') {
      this.selectedObject = false
    } else {
      this.selectedObject = true
    }
    this.updateSelection();
  }

  //custom function used to close/open dropdown picklist
  clickhandler() {
    this.mouse = false
    this.showDropdown = true
    this.clickHandle = true
    this.showselectall = true
  }

  //custom function used to close/open dropdown picklist
  mousehandler() {
    this.mouse = true
    this.dropdownclose()
  }

  //custom function used to close/open dropdown picklist
  blurhandler() {
    this.blurred = true
    this.dropdownclose()
  }

  //custom function used to close/open dropdown picklist
  focuhandler() {
    this.focus = true
  }

  //custom function used to close/open dropdown picklist
  dropdownclose() {
    if (this.mouse === true && this.blurred === true && this.focus === true) {
      //this.searchTerm = ''
      this.showDropdown = false
      this.clickHandle = false
    }
  }

  updateSelection(){
    // Bubble event up to parent
    const selectEvent = new CustomEvent('selection', { detail: { selection: this.selecteditems, name: this.fieldname }});
    this.dispatchEvent(selectEvent);
  }

  //this function is invoked when user deselect/remove (✓) items from dropdown picklist
  handleRemove(event) {
    const valueRemoved = event.target.name
    this.selecteditems = this.selecteditems.filter(
      (profile) => profile.Id !== valueRemoved
    )
    this.allValues.splice(this.allValues.indexOf(valueRemoved), 1)
    this.itemcounts =
      this.selecteditems.length > 0
        ? `${this.selecteditems.length} options selected`
        : 'None Selected'
    this.errormessage()

    if (this.itemcounts === 'None Selected') {
      this.selectedObject = false
    } else {
      this.selectedObject = true
    }

    this.updateSelection();
  }

  //this function is used to deselect/uncheck (✓) all of the items in dropdown picklist
  handleclearall(event) {
    event.preventDefault()
    this.showDropdown = false
    this.selecteditems = []
    this.allValues = []
    this.itemcounts = 'None Selected'
    this.searchTerm = ''
    this.selectionlimit = 1000
    this.errormessage()
    this.selectedObject = false
    this.updateSelection();
  }

  //this function is used to select/check (✓) all of the items in dropdown picklist
  selectall(event) {
    event.preventDefault()

    if (this.valuesVal === undefined) {
      this.valuesVal = this.picklistinput
        ? this.picklistinput.map((value) => value)
        : this.defaultpicklistinput.map((value) => value)

      //below method is used to change the input which we received from parent component
      //we need input in array form, but if it's coming in JSON Object format, then we can use below piece of code to convert object to array
      Object.keys(this.valuesVal).forEach((profile) => {
        this.allValues.push({
          Id: profile,
          Name: this.valuesVal[profile]
        })
      })

      this.valuesVal = this.allValues.sort(function (a, b) {
        return a.Id - b.Id
      })
      this.allValues = []
    }

    // Adding this code in to only select filtered-to values


    var newItems = this.valuesVal.filter((profile) =>
      profile.Name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    var selectedNames = {};
    this.selecteditems.forEach((profile) =>{
      selectedNames[profile.Name] = true;
    });
		this.selecteditems = this.selecteditems.concat(newItems.filter((profile) => !selectedNames[profile.Name]));
    this.itemcounts = this.selecteditems.length + ' options selected'
    this.selectionlimit = this.selecteditems.length + 1
    this.allValues = []
    this.valuesVal.forEach((value) => {
      for (let property in value) {
        if (property === 'Id') {
          this.allValues.push(`${value[property]}`)
        }
      }
    })
    //console.log('valuethis.allValues ', JSON.stringify(this.allValues));
    this.errormessage()
    this.selectedObject = true
    this.updateSelection();
  }

  //this function is used to show the custom error message when user is trying to select picklist items more than selectionlimit passed by parent component
  errormessage() {
    this.errors = {
      'Search Objects':
        'Maximum of ' + this.selectionlimit + ' items can be selected'
    }
    this.template.querySelectorAll('lightning-input').forEach((item) => {
      let label = item.label
      if (label === 'Search Objects') {
        // if selected items list crosses selection limit, it will through custom error
        if (this.selecteditems.length >= this.selectionlimit) {
          item.setCustomValidity(this.errors[label])
        } else {
          //else part will clear the error
          item.setCustomValidity('')
        }
        item.reportValidity()
      }
    })
  }
}
