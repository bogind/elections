nationalResults = []
function runCalc(allResponses){
    tempParties = []
    totalVotes = allResponses["כשרים"]
    responseList = Object.entries(turnObjectToArrayExFields(allResponses,['כשרים','פסולים','מצביעים','בזב',"updated"]))
    for (var i = 0; i < responseList.length; i++) {

        tempParties.push(new party(responseList[i][0],responseList[i][1]))


    }
    _partyConnections = [
        
        new partyConnection(tempParties.find(item => item.partyName === "מרצ"), tempParties.find(item => item.partyName === "אמת")),
        new partyConnection(tempParties.find(item => item.partyName === "פה"), tempParties.find(item => item.partyName === "כן")),
        new partyConnection(tempParties.find(item => item.partyName === "מחל"), tempParties.find(item => item.partyName === "ט")),
        new partyConnection(tempParties.find(item => item.partyName === "ג"), tempParties.find(item => item.partyName === "שס")),
    
        ];
    

        nationalResults = ({parties:tempParties,partyConnections:_partyConnections}) 
        _parties = nationalResults.parties
        console.log(_parties)
        var results =  calcMandates()
        return results
}


// Promise.all([
//     fetch("national.json").then(value => value.json())]).then(allResponses => {
//     tempParties = []
//     totalVotes = allResponses[0]["כשרים"]
//     responseList = Object.entries(turnObjectToArrayExFields(allResponses[0],['כשרים','פסולים','מצביעים','בזב',"updated"]))
//     for (var i = 0; i < responseList.length; i++) {

//         tempParties.push(new party(responseList[i][0],responseList[i][1]))


//     }
//     _partyConnections = [
        
//         new partyConnection(tempParties.find(item => item.partyName === "מרצ"), tempParties.find(item => item.partyName === "אמת")),
//         new partyConnection(tempParties.find(item => item.partyName === "פה"), tempParties.find(item => item.partyName === "כן")),
//         new partyConnection(tempParties.find(item => item.partyName === "מחל"), tempParties.find(item => item.partyName === "ט")),
//         new partyConnection(tempParties.find(item => item.partyName === "ג"), tempParties.find(item => item.partyName === "שס")),
    
//         ];
    

//         nationalResults = ({parties:tempParties,partyConnections:_partyConnections}) 
//         _parties = nationalResults.parties
// console.log(_parties)
function turnObjectToArrayExFields(obj,fields){
    let excludeKeys = new Set(fields);
    let filteredPairs = Object.entries(obj).filter(([ key ]) => !excludeKeys.has(key));
    _partiesObject = Object.fromEntries(filteredPairs);
      
      
      return _partiesObject


}
var party = (function () {

    function party(_name, _votes) {
        this.partyName = _name;
        this.votes = _votes;
        this.connected = false;
        this.reset();
    }
    party.prototype.votesMethod = function () {
        return this.votes;
    };

    party.prototype.totalMandates = function () {
        return this.mandatesByVotes + this.mandatesByConnection + this.spareMandates;
    };

    party.prototype.votesPerMandate = function () {
        var tm = this.totalMandates();
        return tm > 0 ? Math.round(this.votes / tm) : 0;
    };

    party.prototype.reset = function () {
        this.mandatesByVotes = 0;
        this.spareMandates = 0;
        this.mandatesByConnection = 0;
        this.votesToLoseMandate = 0;
        this.missingVotesForOneMandate = 0;
        this.partyLosingMandate = {};
        this.partyEarningMandate = {};
    };

    party.prototype.clone = function () {
        return new party(this.partyName, this.votes);
    };

    return party;
})();
var partyConnection = (function () {
    function partyConnection(_party1, _party2) {
        this.party1 = _party1;
        this.party2 = _party2;
        this.party1.connected = true;
        this.party2.connected = true;
        this.partyName = _party1.partyName + " - " + _party2.partyName;
        this.reset();
    }
    partyConnection.prototype.votesMethod = function () {
        return this.party1.votes + this.party2.votes;
    };

    partyConnection.prototype.reset = function () {
        this.mandatesByVotes = 0;
        this.spareMandates = 0;
    };
    return partyConnection;
})();



function calcMandates (){

    var blockPercent;
    var percent = 0.0325;
    

    console.log("Total votes: " + totalVotes);

    blockPercent = Math.round(totalVotes * percent);
    console.log("Block percent: " + blockPercent + " according to percent of " + (percent * 100));

    var totalVotesAboveBlock = 0;

    for (var i = 0; i < _parties.length; i++) {

        _parties[i].aboveBlockPercent = _parties[i].votes >= blockPercent;
        if (_parties[i].aboveBlockPercent) {
            totalVotesAboveBlock += _parties[i].votes;
            console.log("Party " + _parties[i].partyName + " above block percent with " + _parties[i].votes + " votes");
        }
        else {
            console.log("Party " + _parties[i].partyName + " below block percent with " + _parties[i].votes + " votes");
        }
    }

    console.log("Total votes above block percent: " + totalVotesAboveBlock);

    var generalMeasure = Math.round(totalVotesAboveBlock / 120);
    console.log("General measure: " + generalMeasure);

    var totalMandatesByVotes = 0;

    for (var i = 0; i < _parties.length; i++) {

        if (_parties[i].aboveBlockPercent) {
            _parties[i].mandatesByVotes = Math.floor(_parties[i].votes / generalMeasure);
            totalMandatesByVotes += _parties[i].mandatesByVotes;
        }
    }

    console.log("Total mandates by votes: " + totalMandatesByVotes);

    var result = {};
    result.totalVotes = totalVotes;
    result.blockPercent = blockPercent;
    result.totalVotesAboveBlock = totalVotesAboveBlock;
    result.generalMeasure = generalMeasure;
    result.totalMandatesByVotes = totalMandatesByVotes;
    return result,_parties;
};
