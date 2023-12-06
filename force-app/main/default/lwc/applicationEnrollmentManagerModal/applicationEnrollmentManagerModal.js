import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAnsweredQuestions from '@salesforce/apex/ApplicationEnrollmentController.getAnsweredQuestions';

export default class ApplicationEnrollmentManagerModal extends LightningElement {
	@api modalHeader;
    @api app;
    @api aqcols;
    @api registrationId;
    wiredAnswers = [];
    draftValues = [];
    answers;

    isLoading = false;
    error;

	get contactInfo() {
		return '<strong>Contact Information</strong>: ' + this.app.transactionContactInfo;
	}

	get dateSubmittedHeader() {
		return '<strong>Date Submitted</strong><br />';
	}

    get editModeMessage() {
        return 'Click Save at the bottom of the table to finalize changes.'
    }

    isEditMode = false;

    toggleEditMode(event) {
        this.isEditMode = !this.isEditMode;
    }

    @wire(getAnsweredQuestions, { recordId: '$registrationId' })
    wiredAnswers(result) {
        this.isLoading = true;
        this.wiredAnswers = result;
        if (result.data) {
            this.answers = result.data;
            this.error = undefined;
            this.isLoading = false;
        } else if (result.error) {
            this.error = result.error;
            this.answers = undefined;
            this.isLoading = false;
        }

    }

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
            await this.handleRefreshData();
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

    handleCloseEvent() {
        this.dispatchEvent(new CustomEvent('close'));
    }

	handleRejectEvent() {
		this.dispatchEvent(new CustomEvent('reject'));
	}

	handleOfferEvent() {
		this.dispatchEvent(new CustomEvent('offer'));
	}

    handleRefreshData() {
        this.isLoading = true;
        refreshApex(this.wiredAnswers);
        this.isLoading = false;
    }

}
