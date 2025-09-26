using {db} from '../db/schema.cds';

service RHSnorkelQCTrackerService {
    entity ATTACHMENTS     as projection on db.QC_ATTACHMENTS;

    annotate ATTACHMENTS with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ'],
            to   : ['RHSnorkelMaker']
        }
    ];

    entity QC_HEADER       as projection on db.QC_HEADER;

    annotate QC_HEADER with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ'],
            to   : ['RHSnorkelMaker']
        }
    ];

    entity QC_HEADER_FILES as projection on db.QC_HEADER_FILES;
   

    annotate QC_HEADER_FILES with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ'],
            to   : ['RHSnorkelMaker']
        }
    ];

    entity QC_ITEM         as projection on db.QC_ITEM;

    annotate QC_ITEM with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ'],
            to   : ['RHSnorkelMaker']
        }
    ];

    entity QC_Test_Table as projection on db.QC_Test_Table;
    annotate QC_Test_Table with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ','CREATE'],
            to   : ['RHSnorkelMaker']
        }
    ];

    entity TwentyPointFive as projection on db.TwentyPointFive;
     annotate TwentyPointFive with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ'],
            to   : ['RHSnorkelMaker']
        }
    ];
    entity QC_MEASUREMENTS as projection on db.QC_MEASUREMENTS;
     annotate QC_MEASUREMENTS with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ'],
            to   : ['RHSnorkelMaker']
        }
    ];
    entity QC_CASTING as projection on db.QC_CASTING;
     annotate QC_CASTING with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ'],
            to   : ['RHSnorkelMaker']
        }
    ];
    entity QC_CHECK as projection on db.QC_CHECK;
     annotate QC_CHECK with @restrict: [
        {
            grant: ['*'],
            to   : ['RHSnorkelAdmin']
        },
        {
            grant: [
                'CREATE',
                'READ',
                'UPDATE'
            ],
            to   : ['RHSnorkelChecker']
        },
        {
            grant: ['READ'],
            to   : ['RHSnorkelMaker']
        }
    ];

    action generateQCReport(SNORKEL_NO : String) returns {
        content  : LargeBinary;
        filename : String;
        mimeType : String;
    };
}

// annotate RHSnorkelQCTrackerService with @requires: ['authenticated-user'];
