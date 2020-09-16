var pieces = getPieceInfo();

function setScore() {
    var sbTop = document.getElementById("scoreboardTop");
    if (sbTop.innerHTML === '') {
        // The 'whitePoints' and 'blackPoints' duplicate id elements don't create problems because
        // the redrawScoreboards() function in chessLogic.js wipes the innerHTML from one of them.
        var scoreHTML = 'Score: <span id="whitePoints">0</span> - <span id="blackPoints">0</span>';
        sbTop.innerHTML = scoreHTML;
        document.getElementById("scoreboardSide").innerHTML = scoreHTML;
    }
    
}

function getPieceInfo() {
    var wPawnCoordinates = [];
    var bPawnCoordinates = [];
        for (var file = 1; file <= 8; file++) {
            wPawnCoordinates.push(file + '2');
            bPawnCoordinates.push(file + '7');
        }
    return {
        wKing:{code:'\u2654', startCoordinates:[51]},
        wQueen:{code:'\u2655', startCoordinates:[41]},
        wRook:{code:'\u2656', startCoordinates:[11, 81]},
        wBishop:{code:'\u2657', startCoordinates:[31, 61]},
        wKnight:{code:'\u2658', startCoordinates:[21, 71]},
        wPawn:{code:'\u2659', startCoordinates:wPawnCoordinates},
        bKing:{code:'\u265A',  startCoordinates:[58]},
        bQueen:{code:'\u265B', startCoordinates:[48]},
        bRook:{code:'\u265C', startCoordinates:[18, 88]},
        bBishop:{code:'\u265D', startCoordinates:[38, 68]},
        bKnight:{code:'\u265E', startCoordinates:[28, 78]},
        bPawn:{code:'\u265F', startCoordinates:bPawnCoordinates}
    };
}

function getBoardHTML() {
    var boardHTML = '<table id="gameboard">';
    var colour;
    for (var rank = 8; rank >= 1; rank--) {
        boardHTML += '<tr>\n<td class="label">' + rank + '</td>';
        for (var file = 1; file <= 8; file++) {
            if ((rank + file) % 2 === 0) {
                colour = 'white';
            } else {
                colour = 'black';
            }
            boardHTML += '<td class="square ' + colour + '" id="' + file + rank + '" onclick="handleMoveInput(this)"></td>';
        }
        boardHTML += '</tr>';
    }
    boardHTML += '<td id="blank"></td>';
    for (var file = 1; file <= 8; file++) {
        boardHTML += '<td class="label">' + file + '</td>';
    }
    boardHTML += '</table>';
    return boardHTML;
    
}

function populateBoard() {
    for (var piece in pieces) {
        var coordinates = pieces[piece].startCoordinates;
        for (n = 0; n < coordinates.length; n++) { 
           document.getElementById(coordinates[n]).innerHTML = pieces[piece].code;
           if (piece === 'wKing' || piece === 'bKing' || piece === 'wRook' || piece === 'bRook') {
               document.getElementById(coordinates[n]).classList.add("unmoved");
           }
        }
    }
}

function resetNotation() {
    document.getElementById('logBooks').innerHTML = '';
}

setScore();
document.getElementById('board').innerHTML = getBoardHTML();
populateBoard();
resetNotation();
