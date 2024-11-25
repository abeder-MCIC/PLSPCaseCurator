/* eslint no-unused-vars: "off", no-alert: "off", no-console: "off" */
({
    updateCaseNumbers: function (component, selections, deselections) {
        // Apply selection and deselection transactions to list of case numbers
        var caseNumbers = component.get('v.caseNumbers');
        caseNumbers = caseNumbers.filter(function(num) { return !deselections.includes(num) && !selections.includes(num) }).concat(selections);
        component.set('v.caseNumbers', caseNumbers);
        console.log("Case numbers: " + JSON.stringify(caseNumbers));
      }
    
})
