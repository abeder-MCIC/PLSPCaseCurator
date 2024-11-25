public with sharing class PccDAO {
    @AuraEnabled
    public String initiativeName { get; set; }
    @AuraEnabled
    public String versionName { get; set; }
    @AuraEnabled
    public String claimNumbers { get; set; }

    @AuraEnabled(cacheable=true)
    public static List<String> getInitiatives(){
        AggregateResult[] initiatives = [SELECT Initiative__c FROM PSLP_Curation__c group by Initiative__c ];
        List<String> out = new List<String>();
        for (AggregateResult ar : initiatives){
            out.add((String)ar.get('Initiative__c'));
        }
        return out;
    }

    @AuraEnabled(cacheable=true)
    public static String getVersions(String initiativeName){
        System.debug('Searching for Initiateive Name: "' + initiativeName + '"');
        PSLP_Curation__c[] versions = [SELECT Id, Version__c, CreatedBy.Name, CreatedDate, Active__c FROM PSLP_Curation__c WHERE Initiative__c = :initiativeName ORDER BY CreatedDate desc];
        
        String out = '[';
        for (PSLP_Curation__c pc : versions){
            out += '{ "version": "' + pc.Version__c + '", "createdBy": "' + pc.CreatedBy.Name + '", "active": ' + pc.Active__c + ', "createdDate": "' + pc.CreatedDate + '", "id": "' + pc.Id + '" },';
        }
        System.debug('Returned ' + versions.size() + ' records');
        return out.substring(0, out.length() - 1) + ']';
    }

    @AuraEnabled(cacheable=true)
    public static String getCases(String id){
        List<PSLP_Curation__c> version = [SELECT Claim_Numbers__c FROM PSLP_Curation__c WHERE Id = :id];
        //System.debug('Initiative: ' + initiativeName + ', Version: ' + versionName + ', list size: ' + version.size());
        if (version.size() > 0){
            return version[0].Claim_Numbers__c;
        } else {
            return '';
        }
    }

    @AuraEnabled
    public static Integer saveInitiativeClaims(PccDAO wrapper){
        String initiativeName = wrapper.initiativeName;
        String versionName = wrapper.versionName;
        String claimNumbers = wrapper.claimNumbers;

        PSLP_Curation__c[] toUpdate = [SELECT Id, Active__c FROM PSLP_Curation__c WHERE Initiative__c = :initiativeName AND Active__c = TRUE]; 
        for (PSLP_Curation__c pc : toUpdate){
            pc.Active__c = false;
        }
        try {
            update toUpdate;
        } catch (DmlException e) {
            return -1;
        }
        
        PSLP_Curation__c toCreate = new PSLP_Curation__c(Initiative__c=initiativeName, Version__c=versionName, Claim_Numbers__c=claimNumbers, Active__c=true);
        try {
            insert toCreate;
            return 0;
        } catch (DmlException e) {
            return -1;
        }
    }
}