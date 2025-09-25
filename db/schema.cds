using {
    managed,
    cuid
} from '@sap/cds/common';

namespace db;


entity QC_ATTACHMENTS : cuid, managed {
    sheetNo   : String(10);
    sectionNo : String(10);
    question  : String(255);
    mimeType  : String(100);
    name      : String(255);
    file      : LargeString;
    size      : Integer;
    qC_HEADER : Association to one QC_HEADER;
    qC_ITEM   : Association to one QC_ITEM;
}


entity QC_HEADER : managed {
        CUSTOMER_NAME    : String(50);
    key SNORKEL_NO       : String(100);
        SHEET_NO         : String(10);
        DATE_ENDED       : DateTime;
        DATE_STARTED     : DateTime;
        DRAFT_FLAG       : Boolean @default: true;
        SECTIONCOMPLETED : String(50);
        TYPE             : String;
        CHECKER          :String;

        PRODUCTION_NO    : String(25);
        qc_ATTACHMENTS   : Composition of many QC_ATTACHMENTS
                               on qc_ATTACHMENTS.qC_HEADER = $self;
        qc_ITEMS         : Composition of many QC_ITEM
                               on qc_ITEMS.qC_HEADER = $self;
        qc_TESTS         : Composition of many QC_Test_Table
                               on qc_TESTS.qC_HEADER = $self;
        headerFiles      : Composition of many QC_HEADER_FILES
                               on headerFiles.SNORKEL_NO    = $self.SNORKEL_NO
                               or headerFiles.CUSTOMER_NAME = $self.CUSTOMER_NAME;

        twentyPointFive  : Composition of many TwentyPointFive
                               on twentyPointFive.qC_HEADER = $self;

        qc_MEASUREMENTS  : Composition of many QC_MEASUREMENTS
                               on qc_MEASUREMENTS.qC_HEADER = $self;


        qc_CASTING       : Composition of many QC_CASTING
                               on qc_CASTING.qC_HEADER = $self;


        qc_CHECK         : Composition of many QC_CHECK
                               on qc_CHECK.qC_HEADER = $self;
}

entity QC_HEADER_FILES : cuid, managed {
    mimeType      : String(100);
    name          : String(255);
    file          : LargeString;

    SNORKEL_NO    : String(100);
    CUSTOMER_NAME : String(50);

    qC_HEADER     : Association to one QC_HEADER
                        on qC_HEADER.SNORKEL_NO    = SNORKEL_NO
                        or qC_HEADER.CUSTOMER_NAME = CUSTOMER_NAME;
}

entity QC_ITEM : cuid {
    ACTUAL_VALUE          : String(100);
    COMMENTS              : String(100);
    CORRECTIVE_ACTION     : String(100);
    DATE_INSPECTED        : DateTime;
    DECISION_TAKEN        : String(10);
    HEADER_ID             : UUID;
    INSPECTED_BY          : String(100);
    METHOD                : String(100);
    POSITION              : String(100);
    QUESTION              : String(200);
    SECTION_NO            : String(100);
    SUBSTEP               : String(100);
    TOLERANCE             : String(100);
    VISIBLE               : Boolean;
    WORK_ITEM_DESCRIPTION : String(100);
    WorkProcessStep       : String(100);
    PipeNo1               : String(50);
    PipeNo2               : String(50);
    PipeNo3               : String(50);
    PipeNo4               : String(50);
    PipeNo5               : String(50);
    PipeNo6               : String(50);
    PipeNo7               : String(50);
    PipeNo8               : String(50);
    PipeNo9               : String(50);
    PipeNo10              : String(50);
    PipeNo11              : String(50);
    PipeNo12              : String(50);
    characterField        :String(50);
    aTTACHMENTS           : Composition of many QC_ATTACHMENTS
                                on aTTACHMENTS.qC_ITEM = $self;
    qC_HEADER             : Association to one QC_HEADER;
    qc_TESTS              : Composition of many QC_Test_Table
                                on qc_TESTS.qC_ITEM = $self;
}

entity QC_Test_Table : cuid, managed {
    sheetNo        : String(10);
    actualvalue    : String(100);
    date           : DateTime;
    ff1            : String(100);      // Added to capture DB ff1
    ff2            : String(100);      // Already exists in DB
    fluidity       : String(100);
    method         : String(100);
    no             : String(100);
    position       : String(100);
    powderweight   : String(100);
    remark         : String(100);
    settleduration : String(100);
    spec           : String(100);
    specification  : String(100);
    testNo         : String(100);
    testname       : String(100);
    tf1            : String(100);      // Added to capture DB tf1
    tf2            : String(100);      // Already exists in DB
    tolerance      : String(100);
    vibration      : String(100);
    watercasting   : String(100);
    QUESTION              : String(200);
    batchNo        : String(100);      // Changed from batcho → batchNo
    qC_HEADER      : Association to one QC_HEADER;
    qC_ITEM        : Association to one QC_ITEM;
}

entity TwentyPointFive : cuid {

    shop           : String;
    InspectionDate : DateTime;
    Approve1       : String;
    Approve2       : String;
    Checked        : String;
    Inspection1    : String;
    Inspection2    : String;
    type           : String;
    qC_HEADER      : Association to one QC_HEADER;

}
entity QC_MEASUREMENTS : cuid {
    // Link back to header
    qC_HEADER             : Association to one QC_HEADER;

    // From Excel table
    measurementItem       : String(100);   // e.g. "Overall Height"
    sign                  : String(10);    // A, B, C, D, E, F
    standard              : String(50);    // e.g. "900 +10 -5"

    // Measurement Points (up to 4)
    mp1                   : String;
    mp2                   : String;
    mp3                   : String;
    mp4                   : String;
    
    mp5                  : String;
    

    checkStatus           : String(20);    // e.g. OK / Not OK
    remarks               : String(255);

    // Audit fields
    createdAt             : Timestamp;
    createdBy             : String(50);
    modifiedAt            : Timestamp;
    modifiedBy            : String(50);
}


// ===== CASTING =====
entity QC_CASTING : cuid {
    brickBrandName    : String(100);
    brickLotNo        : String(50);

    castableBrandName : String(100);
    castableLotNo     : String(50);

    addedWaterPercent : String;
    mixingTimeMin     : String;

    argonPipeFlowLPM  : String;   // Top-level title control
    argonPipeFlowA    : String;
    argonPipeFlowB    : String;
    argonPipeFlowC    : String;
    argonPipeFlowD    : String;
    argonPipeFlowE    : String;
    argonPipeFlowF    : String;
    argonPipeFlowG    : String;
    argonPipeFlowH    : String;
    argonPipeFlowI    : String;
    argonPipeFlowJ    : String;
    argonPipeFlowK    : String;
    argonPipeFlowL    : String;

    // Remarks/checks from Final Casting UI
    remarkA           : String(255);
    checkA            : String(50);
    remarkB           : String(255);
    checkB            : String(50);

    remarks           : String(255);
    checkStatus       : String(20);
    type              : String;

    // Relation to header
    qC_HEADER         : Association to one QC_HEADER;
}
// ===== FINAL CHECK =====
entity QC_CHECK : cuid {
    curingTimeHr      : String;
    dryingTimeHr      : String;
    dryingFurnace     : String(50);
    afterDrying       : String(100);
    preAssembly       : String(100);

    argonPipeWelding  : String(20);
    snorkelLotNo      : String(50);
    stencilingMarking : String(100);

    // Remarks and check for multiple sections
    remarkA           : String(255);
    checkA            : String(50);
    remarkB           : String(255);
    checkB            : String(50);

    type              : String;
    remarks           : String(255);
    checkStatus       : String(20);

    // Relation to header
    qC_HEADER         : Association to one QC_HEADER;
}
