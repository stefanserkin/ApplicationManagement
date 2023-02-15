@isTest
private class ApplicationEnrollmentController_Test {
    
    @isTest
    static void testGetApplications() {
        Id fakeCourseOptionId = TestUtility.getFakeId( TREX1__Course_Option_Enrollment__c.SObjectType );
        List<TREX1__Course_Option_Enrollment__c> lstEnrollments = new List<TREX1__Course_Option_Enrollment__c>();
        Test.startTest();
        lstEnrollments = ApplicationEnrollmentController.getApplications(
            fakeCourseOptionId
        );
        Test.stopTest();
        System.assert(lstEnrollments.isEmpty(), 'List should be empty');
    }

    @isTest
    static void testGetAnsweredQuestions() {
        Id fakeRegistrationId = TestUtility.getFakeId( TREX1__Registration__c.SObjectType );
        List<TREX1__Answered_Question__c> lstAnswers = new List<TREX1__Answered_Question__c>();
        Test.startTest();
        lstAnswers = ApplicationEnrollmentController.getAnsweredQuestions(
            fakeRegistrationId
        );
        Test.stopTest();
        System.assert(lstAnswers.isEmpty(), 'List should be empty');
    }

}
