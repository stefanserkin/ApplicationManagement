import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';

import getApplications from '@salesforce/apex/ApplicationEnrollmentController.getApplications';

import ID_FIELD from '@salesforce/schema/TREX1__Course_Option_Enrollment__c.Id';
import STATUS_FIELD from '@salesforce/schema/TREX1__Course_Option_Enrollment__c.Application_Status__c';

/* Application statuses */
const STATUSES = ['New','Under Review','Pending Confirmation','Approved','Rejected','Cancelled'];

/* Answered question datatable columns for modal */
const AQCOLS = [
	{ label: 'Question', fieldName: 'TREX1__Question__c', type: 'text', hideDefaultActions: true, wrapText: true },
	{ label: 'Answer', fieldName: 'TREX1__Answer__c', type: 'text', editable: true, hideDefaultActions: true, wrapText: true },
];

export default class ApplicationEnrollmentManager extends NavigationMixin(LightningElement) {
	@api recordId;

	isLoading = false;
	showModal = false;
	error;

	toastTitle = '';
	toastMessage = '';
	toastVariant = '';

	cardTitle = 'Manage Applications';
	cardIcon = 'custom:custom18';
	activeTab = 1;
	activeStatus = 'New';

	statuses = STATUSES;
	cols;
	aqcols = AQCOLS;

	wiredApplications = [];
	draftValues = [];
	allApplications;
	apps;

	selectedApp;
	answeredQuestions = [];

	selectedRegistrationId;

	/* Constructor */

	constructor() {
        super();
        this.cols = [
            { label: 'Applicant', fieldName: 'applicantName', type: 'text', hideDefaultActions: true },
			{ label: 'Member', fieldName: 'isMember', type: 'boolean', hideDefaultActions: true },
			{ label: 'Age', fieldName: 'applicantAge', type: 'number', hideDefaultActions: true, 
				cellAttributes: { 
					alignment: 'left' 
				}
			},
			{ label: 'Status', fieldName: 'Application_Status__c', type: 'text', initialWidth: 150, hideDefaultActions: true },
			{ label: 'Application Date/Time', fieldName: 'Application_Date_Time__c', type: 'date', initialWidth: 200, 
				typeAttributes: {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					hour12: true
				}, 
				editable: true, sortable: false
			},
            { type: 'action', typeAttributes: { rowActions: this.getRowActions } },
        ];
    }

	getRowActions(row, doneCallback) {

		if (row.Application_Status__c === 'New') {
			doneCallback([
				{ label: 'View Application', name: 'view_application', iconName: 'action:preview' },
				{ label: 'Go to Record', name: 'go_to_record', iconName: 'action:record' },
				{ label: 'Submit for Review', name: 'submit_for_review', iconName: 'action:submit_for_approval'},
				{ label: 'Move to Pending Confirmation', name: 'offer_spot', iconName: 'action:priority' },
				{ label: 'Approve Application', name: 'approve_application', iconName: 'action:approval' },
				{ label: 'Reject Application', name: 'reject_application', iconName: 'action:reject' },
			]);

		} else if (row.Application_Status__c === 'Under Review') {
			doneCallback([
				{ label: 'View Application', name: 'view_application', iconName: 'action:preview' },
				{ label: 'Go to Record', name: 'go_to_record', iconName: 'action:record' },
				{ label: 'Move to Pending Confirmation', name: 'offer_spot', iconName: 'action:priority' },
				{ label: 'Approve Application', name: 'approve_application', iconName: 'action:approval' },
				{ label: 'Reject Application', name: 'reject_application', iconName: 'action:reject' },
			]);

		} else if (row.Application_Status__c === 'Pending Confirmation') {
			doneCallback([
				{ label: 'View Application', name: 'view_application', iconName: 'action:preview' },
				{ label: 'Go to Record', name: 'go_to_record', iconName: 'action:record' },
				{ label: 'Approve Application', name: 'approve_application', iconName: 'action:approval' },
				{ label: 'Reject Application', name: 'reject_application', iconName: 'action:reject' },
			]);

		} else {
			doneCallback([
				{ label: 'View Application', name: 'view_application', iconName: 'action:preview' },
				{ label: 'Go to Record', name: 'go_to_record', iconName: 'action:record' },
				{ label: 'Reopen Application', name: 'reopen', iconName: 'action:recall' },
			]);

		}
    }

	/* Get course option enrollment data */

	@wire(getApplications, { 
		recordId: '$recordId'
	}) wiredApps(result) {
		this.isLoading = true;
		this.wiredApplications = result;
        if (result.data) {
			let rows = JSON.parse( JSON.stringify(result.data) );

			for (let i = 0; i < rows.length; i++) {
            	let dataParse = rows[i];
				let contactInfo = '';
				dataParse.applicantName = dataParse.TREX1__Contact__r.FirstName + ' ' + dataParse.TREX1__Contact__r.LastName;
				dataParse.applicantAge = dataParse.TREX1__Contact__r.TREX1__Age__c;
				if (dataParse.TREX1__Contact__c != dataParse.TREX1__Transaction__r.TREX1__Contact__c) {
					contactInfo += dataParse.TREX1__Transaction__r.TREX1__Contact__r.FirstName + 
						' ' + dataParse.TREX1__Transaction__r.TREX1__Contact__r.LastName;
				} else {
					contactInfo += dataParse.applicantName;
				}

				if (dataParse.TREX1__Transaction__r.TREX1__Contact__r.Email != null) {
					contactInfo += ' | ' + dataParse.TREX1__Transaction__r.TREX1__Contact__r.Email;
				}

				if (dataParse.TREX1__Transaction__r.TREX1__Contact__r.Phone != null) {
					contactInfo += ' | ' + dataParse.TREX1__Transaction__r.TREX1__Contact__r.Phone;
				}
				dataParse.transactionContactInfo = contactInfo;
				dataParse.isMember = dataParse.TREX1__Contact__r.Contact_Type__c === 'Member';
				// Show modal actions
				dataParse.showModalActions = 
					dataParse.Application_Status__c != null && 
						(dataParse.Application_Status__c === 'New' || 
						dataParse.Application_Status__c === 'Under Review') ?
					true :
					false;
			}

            this.allApplications = rows;
			this.apps = rows.filter(row => row.Application_Status__c === this.activeStatus);
            this.error = undefined;
			this.isLoading = false;
        } else if (result.error) {
            this.error = result.error;
            this.allApplications = undefined;
			this.isLoading = false;
        }
    }

	/* Datatable edit - save */
	async handleSave(event) {
		this.isLoading = true;

        // Convert datatable draft values into record objects
        const records = event.detail.draftValues.slice().map((draftValue) => {
            const fields = Object.assign({}, draftValue);
            return { fields };
        });

        // Clear all datatable draft values
        this.draftValues = [];

        try {
            // Update all records in parallel thanks to the UI API
            const recordUpdatePromises = records.map((record) =>
                updateRecord(record)
            );
            await Promise.all(recordUpdatePromises);

            // Report success with a toast
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Records updated',
                    variant: 'success'
                })
            );

            // Display fresh data in the datatable
            await refreshApex(this.wiredApplications);
			this.isLoading = false;
			
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error updating or reloading records',
                    message: error.body.message,
                    variant: 'error'
                })
            );
			this.isLoading = false;
        }
    }

	/* Row actions */

	handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
		const registrationId = row.TREX1__Registration__c;
		this.selectedApp = row;

        switch (actionName) {

            case 'view_application':
                this.viewApplication(registrationId);
                break;

			case 'go_to_record':
				this.goToRecord(row.Id);
				break;

			case 'submit_for_review':
				this.toastTitle = 'Under Review';
				this.toastMessage = 'The application was moved to the Under Review folder';
				this.toastVariant = 'success';
				this.updateAppStatus(row.Id, 'Under Review');
				break;

			case 'offer_spot':
				this.toastTitle = 'Spot Offered';
				this.toastMessage = 'The application was moved to the Pending Confirmation folder';
				this.toastVariant = 'success';
                this.updateAppStatus(row.Id, 'Pending Confirmation');
				break;

            case 'approve_application':
				this.toastTitle = 'Application Approved';
				this.toastMessage = 'The application was moved to the Approved folder';
				this.toastVariant = 'success';
                this.updateAppStatus(row.Id, 'Approved');
                break;

			case 'reject_application':
				this.toastTitle = 'Application Rejected';
				this.toastMessage = 'The application was moved to the Rejected folder';
				this.toastVariant = 'info';
				this.updateAppStatus(row.Id, 'Rejected');
				break;

			case 'reopen':
				this.toastTitle = 'Application Reopened';
				this.toastMessage = 'The application was moved to the New folder';
				this.toastVariant = 'success';
				this.updateAppStatus(row.Id, 'New');
				break;
				
            default:
        }
    }

	updateAppStatus(rowId, newStatus) {
		const fields = {};
		fields[ID_FIELD.fieldApiName] = rowId;
		fields[STATUS_FIELD.fieldApiName] = newStatus;

		const recordInput = {
			fields: fields
		};

		this.isLoading = true;

		updateRecord(recordInput).then((record) => {
			this.showToast();
			refreshApex(this.wiredApplications);
			this.isLoading = false;
		});

	}

	viewApplication(registrationId) {
		this.selectedRegistrationId = registrationId;
		this.showModal = true;
	}

	goToRecord(rowId) {
		this[NavigationMixin.GenerateUrl]({
			type: 'standard__recordPage',
			attributes: {
				recordId: rowId,
				actionName: 'view'
			}
		}).then(generatedUrl => {
			window.open(generatedUrl, '_blank');
		});
	}

	showToast() {
		const event = new ShowToastEvent({
			title: this.toastTitle,
			message: this.toastMessage,
			variant: this.toastVariant,
		});
		this.dispatchEvent(event);
	}
	
	/* Tab and modal navigation */

	get tabs() {
        const tabs = [];
        for (let i = 0; i < this.numOfTabs; i++) {
            tabs.push({
                value: `${i}`,
                label: `${this.statuses[i]}`,
                header: `${this.statuses[i]} Applications`,
            });
        }
        return tabs;
    }

	get numOfTabs() {
		return this.statuses != null && this.statuses.length > 0 ? this.statuses.length : 0;
	}

    handleActiveTab(event) {
        this.activeTab = event.target.value;
		this.activeStatus = `${event.target.label}`;
		this.apps = [];
		if (this.allApplications != null && this.allApplications.length > 0) {
			this.apps = this.allApplications.filter(row => row.Application_Status__c === this.activeStatus);
		}
    }

	handleModalClose() {
		this.showModal = false;
	}

	handleModalReject() {
		this.showModal = false;
		this.toastTitle = 'Application Rejected';
		this.toastMessage = 'The application was moved to the Rejected folder';
		this.toastVariant = 'info';
		this.updateAppStatus(this.selectedApp.Id, 'Rejected');
	}

	handleModalOffer() {
		this.showModal = false;
		this.toastTitle = 'Spot Offered';
		this.toastMessage = 'The application was moved to the Pending Confirmation folder';
		this.toastVariant = 'success';
		this.updateAppStatus(this.selectedApp.Id, 'Pending Confirmation');
	}

	refreshComponent() {
		refreshApex(this.wiredApplications);
	}

}