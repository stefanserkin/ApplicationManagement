import { LightningElement, api } from 'lwc';
// import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAnsweredQuestions from '@salesforce/apex/ApplicationEnrollmentController.getAnsweredQuestions';

export default class ApplicationEnrollmentManagerModal extends LightningElement {
	@api modalHeader;
    @api app;
    // @api answeredQuestions;
    @api registrationId;

    // refresh when parent component data refreshes
    /*
    @api set objAqData(value) {
        this.answeredQuestions = [...value];
    }
    get objAqData() {
        return this.answeredQuestions;
    }
    answeredQuestions;
    showFeedback = false;
    connectedCallBack(){
        this.answeredQuestions = Object.assign({},this.objAqData);
    }
    showFeedbacks(event){
        this.showFeedback =  !this.showFeedback;
    }
    */
    

	@api aqcols;

	draftValues = [];

	get contactInfo() {
		return '<strong>Contact Information</strong><br />' + this.app.transactionContactInfo;
	}

	get dateSubmittedHeader() {
		return '<strong>Date Submitted</strong><br />';
	}

    handleRefreshApplication() {
		console.log(':::: refreshing application');
		getAnsweredQuestions({ recordId: this.selectedRegistrationId })
            .then((result) => {
                this.answeredQuestions = result;
                this.error = undefined;
            })
            .catch((error) => {
                this.error = error;
                this.answeredQuestions = undefined;
            });
	}

	async handleSave(event) {
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
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error updating or reloading records',
                    message: error.body.message,
                    variant: 'error'
                })
            );
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
        console.log('::::: refresh data');
        this.dispatchEvent(new CustomEvent('refresh'));
    }

}