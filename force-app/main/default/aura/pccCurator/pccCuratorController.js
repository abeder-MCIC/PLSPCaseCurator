/* eslint no-unused-vars: "off", no-alert: "off", no-console: "off" */
({
  handleIds: function (component, event) {
    var detail = event.$_params$;
    var dsId = detail.dsId;
    var dsVersionId = detail.dsVersionId;
    component.set('v.dsId', dsId);
    component.set('v.dsVersionId', dsVersionId);
  },

  handleFilterSelection: function (component, event) {
    var detail = event.$_params$;
    component.set('v.filterJSON', detail.filters);
    component.set('v.columnJSON', detail.columns);
  },

  handleListCaseSelection: function (component, event, helper) {
    event.stopPropagation();
    var detail = event.$_params$;
    var selections = detail.selections.map(function(item){
        return item.id;
    });

    component.set('v.listSelDesel', JSON.stringify({selections: selections, deselections: detail.deselections }));
    helper.updateCaseNumbers(component, selections, detail.deselections);
  },

  handleDashboardTabClick: function (component, event, helper){
    var timerId = setInterval(function(){
        var isLoaded = component.find("WaveDashboard").get("v.isLoaded");
        if (isLoaded){
            component.set('v.filterDisabled', false);
            clearTimeout(timerId);
        }
    }, 1000);
  },

  handleSearchCaseSelection: function (component, event, helper) {
    event.stopPropagation();
    var detail = event.$_params$;
    var newCaseData = detail.selections;
    var selections = detail.selections.map(function(item){
        return item.id;
    });
    if (!component.get('v.isListLoaded')){
        newCaseData = newCaseData.concat(JSON.parse(component.get('v.newCaseSelections')));
        var oldSelections = JSON.parse(component.get('v.selectionsDeselections')).selections;
        oldSelections = oldSelections ? oldSelections : [];
        oldSelections = oldSelections.filter(function(num) { return !detail.deselections.includes(num) });
        selections = selections.concat(oldSelections);
    }

    component.set('v.newCaseSelections', JSON.stringify(newCaseData));
    component.set('v.selectionsDeselections', JSON.stringify({selections: selections, deselections: detail.deselections }));
    helper.updateCaseNumbers(component, selections, detail.deselections);
  },

  handleListLoaded: function (component, event) {
    component.set('v.isListLoaded', true);
  },

  handleClearUnselected: function (component, event) {
    var caseNumbers = component.get('v.caseNumbers');
    component.set('v.clearTo', JSON.stringify(caseNumbers));
  },

  handleLoad: function (component, event) {
    var detail = event.$_params$;
    var caseNumbers = detail.caseNumbers;
    component.set('v.caseNumbers', caseNumbers);
    component.set('v.load', caseNumbers.join(','));
  },
  
  handleFilterDashboard: function (component, event) {
    //var caseNumbers = [];
    var caseNumbers = component.get('v.caseNumbers');

    var filter = {
      datasets: {
        Report_PSLP_with_Layers: [
          {
            fields: ['MCIC_Claim_Number__c'],
            filter: {
              locked: true,
              operator: 'in',
              values: caseNumbers
            }
          }
        ]
      }
    };

    //alert(filter);
    console.log(JSON.stringify(filter));
    component.set('v.waveFilter', JSON.stringify(filter));
    var filterAttribute = component.get('v.waveFilter');
    var developerName = 'PSLP_Curation_Dashboard';
    var evt = $A.get('e.wave:update');
    evt.setParams({
      value: filterAttribute,
      devName: developerName,
      type: 'dashboard'
    });
    evt.fire();
  }
});
