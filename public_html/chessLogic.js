'use strict';

function handleMoveInput(square) {
    var handler;
    if (move.getStart() === undefined) {
        handler = new StartInputHandler();
    } else {
        handler = new DestinationInputHandler();
    }
    handler.handle(square);
}

function initialiseVariables() {
    moveCount = 0;
    toMove = 'w';
    move = new Move(undefined);
    drawCountdown = 100;
    lastFivePositions = [];
    lastFivePositions[8] = initialBoardState;
    squares = document.getElementsByClassName('square');
}

function resetBoard() {
    var script = document.createElement('script');
    script.src = 'chessSetup.js';
    document.getElementById('board').appendChild(script);
    initialiseVariables();
    redrawBoard();
}

function redrawPage() {
    redrawScoreboards();
    redrawBoard();
}

function redrawScoreboards() {
    var sbTop = document.getElementById('scoreboardTop');
    var sbSide = document.getElementById('scoreboardSide');
    var notation = document.getElementById('notation');
    if (window.outerWidth <= window.outerHeight) {
        if (notation.style.display !== 'none') {
            sbTop.innerHTML = sbSide.innerHTML;
            sbSide.innerHTML = '';
            notation.style.display = 'none';
            sbTop.style.display = '';
        }
    } else {
        if (sbTop.style.display !== 'none') {
            sbSide.innerHTML = sbTop.innerHTML;
            sbTop.innerHTML = '';
            sbTop.style.display = 'none';
            notation.style.display = '';
        }
    }
}

function redrawBoard() {
    var squareSpace = Math.floor((window.outerHeight - 200) / 9.5);
    if (document.getElementById('scoreboardTop').style.display === '') {
        squareSpace *= 0.8;
    }
    if (squareSpace < 50) {
        squareSpace = 50;
    }
    for(var i = 0; i < 64; i++) {
        squares[i].style.height = squareSpace + 'px';
        squares[i].style.minWidth = squareSpace * 0.9 + 'px';
        squares[i].style.fontSize = squareSpace * 0.7 + 'px';
    }
    document.getElementById('scoreboardTop').style.marginLeft = squareSpace * 3 + 'px';
    document.getElementById('scoreboardTop').style.width = squareSpace * 3 + 'px';
    document.getElementById('scoreboardTop').style.fontSize = squareSpace / 2 + 'px';
}

class InputHandler {
    
    constructor() {
        
    }
    
    reset() {
        var start = move.getStart();
        AestheticsManager.prepAnimation(start);
        start.style.background = '';
        move.setStart(undefined);
    }

}

class StartInputHandler extends InputHandler {
    
    constructor() {
        super();
    }

    handle(start) {
        var occupant = PieceReference.getOccupant(start);
        var valid = this.isValid(occupant);
        if (valid) {
            if (move.getDestination() !== undefined) AestheticsManager.flushAccepted(move.getDestination());
            AestheticsManager.flushRejected();
            var newMove;
            if (occupant.piece === toMove + 'Pawn') {
                var enPassantSquare;
                if (move instanceof PawnMove) {
                    enPassantSquare = move.enPassantSquare;
                }
                newMove = new PawnMove(start, enPassantSquare);
            } else if (occupant.piece === 'king') {
                newMove = new KingMove(start);
            } else {
                newMove = new PieceMove(start);
            }
            newMove.setCheckers(move.getCheckers());
            var legalDestinations = newMove.retrieveLegalDestinations();
            if (legalDestinations.length > 0) {
                move = newMove;
                do {
                    legalDestinations.pop().classList.add('destination');
                } while(legalDestinations.length > 0)
            } else {
//                if (moveCount > 0) this.reset();
                valid = false;
            }
        }
        AestheticsManager.flash(valid, start);
    }

    isValid(occupant) {
        return occupant.colour === toMove;
    }

}

class DestinationInputHandler extends InputHandler {
    
    constructor() {
        super();
    }

    handle(destination) {
        var valid = this.isValid(destination);
        if (valid){
            var moveRecorder = new MoveRecorder(destination);
            move.makeMove(destination);
            this.endTurn();
            var kingExaminer = new KingMoveFinder();
            var kingSquare = kingExaminer.getKing();
            var checkers = kingExaminer.getCheckers();
            var result;
            if (checkers.length > 0) {
                this.setCheck(kingSquare, checkers);
                if (kingExaminer.isMated()) {
                    moveRecorder.recordMate();
                    kingSquare.classList.add('mated');
                    result = 'Checkmate';
                } else {
                    moveRecorder.recordCheck();
                }
            } else {
                moveRecorder.recordMove();
                if (this.isStalemate()) {
                    result = 'Stalemate';
                }
            }
            if (result === undefined) {
                if (!this.isWinnable()) {
                    result = 'Insufficient material';
                } else if (--drawCountdown === 0) {
                    result = '50 move rule';
                } else if (this.isThreeFoldRepetition()) {
                    result = 'Three-fold repetition';
                }
            }
        }
        if (result !== undefined) {
            this.endGame();
            AestheticsManager.flushAccepted(destination);
            moveRecorder.displayResult(result);
            this.makeResetButton();
        }
        this.reset();
    }

    isValid(square) {
        return square.classList.contains('destination');
    }
    
    setCheck(kingSquare, checkers) {
        kingSquare.classList.add('checked');
        move.setCheckers(checkers);
    }

    reset() {
        super.reset();
        var destinations = document.getElementsByClassName('destination');
        while (destinations.length > 0) {
            AestheticsManager.prepAnimation(destinations[0]);
            destinations[0].classList.remove('destination');
        }
    }

    endTurn() {
        moveCount++;
        if (toMove === 'w') {
            toMove = 'b';
        } else {
            toMove = 'w';
        }
        var escapedKing = document.getElementsByClassName('checked');
        if (escapedKing.length > 0) {
            escapedKing[0].classList.remove('checked');
        }
        this.recordPosition();
    }
    
    recordPosition() {
        for (var i = 0; i < 8; i++) {
            lastFivePositions[i] = lastFivePositions[i + 1];
        }
        lastFivePositions[8] = document.getElementById('board').innerText;
    }
    
    isWinnable() {
        var foundWhiteMinor = false;
        var foundBlackMinor = false;
        var occupant;
        for (var i = 0; i < squares.length; i++) {
            occupant = PieceReference.getOccupant(squares[i]);
            switch (occupant.piece) {
                case '':
                    break;
                case 'king':
                    break;
                case 'bishop' || 'knight':
                    var isWinnable;
                    if (occupant.colour === 'w') {
                        isWinnable = foundWhiteMinor;
                        foundWhiteMinor = true;
                    } else {
                        isWinnable = foundBlackMinor;
                        foundBlackMinor = true;
                    }
                    if (isWinnable) {
                        return true;
                    }
                    break;
                default:
                    return true;
            }
        }
        return false;
    }
    
    isStalemate() {
        if (! new KingMoveFinder().isChecked()) {
            var occupant;
            var i = 0;
            do {
                occupant = PieceReference.getOccupant(squares[i]);
                if (occupant.colour === toMove) {
                    var moveFinder;
                    var tempMove;
                    switch (occupant.piece) {
                        case 'king':
                            tempMove = new KingMove(squares[i]);
                            moveFinder = new KingMoveFinder(squares[i], tempMove);
                            break;
                        case 'pawn':
                            var enPassantSquare = undefined;
                            if (move instanceof PawnMove) {
                                enPassantSquare = move.enPassantSquare;
                            }
                            tempMove = new PawnMove(squares[i], enPassantSquare);
                            moveFinder = new PawnMoveFinder(squares[i], tempMove);
                            break;
                        default:
                            tempMove = new PieceMove(squares[i]);
                            moveFinder = new PieceMoveFinder(squares[i], tempMove);
                    }
                    if (moveFinder.getLegalDestinations().length > 0) {
                        return false;
                    }
                }
            } while (++i < squares.length);
            return true;
        }
        return false;
    }
    
    isThreeFoldRepetition() {
        return lastFivePositions[8] === lastFivePositions[4] && lastFivePositions[4] === lastFivePositions[0];
    }
    
    endGame() {
        for (var i = 0; i < squares.length; i++) {
            squares[i].removeAttribute('onclick');
        }
    }
    
    makeResetButton() {
        window.setTimeout( 
            function() {
                document.getElementById('board').innerHTML += 
                '<button onclick="resetBoard()" class="button">Reset Board</button>';
            }
        , 2000);
    }
    
}

class Move {
    
    constructor(square) {
        this.start = square;
        this.destination = undefined;
        this.checkers = [];
        this.turnNumber = moveCount;
        this.finder;
    }
    
    setStart(start) {
        this.start = start;
    }
    
    setDestination(destination) {
        this.destination = destination;
    }
    
    setCheckers(checkers) {
        this.checkers = checkers;
    }
    
    getStart() {
        return this.start;
    }
    
    getDestination() {
        return this.destination;
    }
    
    getCheckers() {
        return this.checkers;
    }
    
    retrieveLegalDestinations() {
        var destinations = this.finder.getLegalDestinations();
        if (this.getCheckers().length === 0 || PieceReference.getOccupant(this.start).piece === 'king') {
            return destinations;
        }
        return this.getCheckEnders(destinations);
    }
    
    getCheckEnders(destinations) {
        var checkers = this.getCheckers();
        var checkEnders = destinations;
        if (checkers.length > 1) {
            return [];
        }
        var checker = checkers[0];
        for (var i = 0; i < checkEnders.length; i++) {
            if (checker !== checkEnders[i]) {
                var capturedPieceCode = checkEnders[i].innerHTML;
                this.makeMove(checkEnders[i]);
                var pinFinder = new PinFinder(checkEnders[i]);
                if (!pinFinder.isPinned()) {
                    checkEnders.splice(i--, 1);
                }
                this.undoMove(capturedPieceCode, [checker]);
            }
        }
        return destinations;
    }

    makeMove(destination) {
        this.setDestination(destination);
        this.setCheckers([]);
        this.destination.innerHTML = this.start.innerHTML;
        this.start.innerHTML = '';
        if (destination.classList.contains("unmoved")) {
            destination.classList.remove("unmoved");
        }
    }
    
    undoMove(capturedPieceCode, checkers) {
        this.start.innerHTML = this.destination.innerHTML;
        this.destination.innerHTML = capturedPieceCode;
        this.setDestination(undefined);
        this.setDestination(undefined);
        this.setCheckers(checkers);
    }
    
}

class PieceMove extends Move {
    
    constructor(square) {
        super(square);
        this.finder = new PieceMoveFinder(square, this);
    }
    
}

class KingMove extends Move {
    
    constructor(square) {
        super(square);
        this.finder = new KingMoveFinder(square, this);
    }
    
    makeMove(destination) {
        super.makeMove(destination);
        if (Math.abs(this.finder.getFile(this.start) - this.finder.getFile(this.destination)) === 2) {
            this.castle();
        }
    }
    
    castle() {
        var direction = this.finder.getDirection(this.start, this.destination);
        var rookSquare, rookFile;
        if (direction === 'W') {
            rookSquare = document.getElementById('1' + this.finder.getRank(this.start));
            rookFile = 4;
        } else {
            rookSquare = document.getElementById('8' + this.finder.getRank(this.start));
            rookFile = 6;
        }
        var rookCode = rookSquare.innerHTML;
        rookSquare.innerHTML = '';
        document.getElementById(rookFile + '' + this.finder.getRank(rookSquare)).innerHTML = rookCode;
    }
    
}

class PawnMove extends Move {
    
    constructor(square, enPassantSquare) {
        super(square);
        this.enPassantSquare = enPassantSquare;
        this.finder = new PawnMoveFinder(square, this);
    }

    setEnPassantSquare() {
        var squareRank = this.finder.getRank(this.start);
        if (toMove === 'w') {
            squareRank++;
        } else {
            squareRank--;
        }
        this.enPassantSquare = {
            square:document.getElementById(this.finder.getFile(this.start) + "" + squareRank), 
            birthday:moveCount
        };
    }

    forgetEnPassantSquare() {
        this.enPassantSquare = undefined;
    }
    
    isEnPassantSquare(square) {
        if (this.enPassantSquare !== undefined && this.enPassantSquare.birthday === moveCount-1 && this.enPassantSquare.square === square) {
            return true;
        }
        return false;
    }
    
    isQueenSquare() {
        return this.finder.getRank(this.destination) === 1 || this.finder.getRank(this.destination) === 8; 
    }
    
    queenPawn() {
        var queenCodes = {
            w:'\u2655',
            b:'\u265B'
        };
        this.destination.innerHTML = queenCodes[PieceReference.getOccupant(this.destination).colour];
    }
    
    makeMove(destination) {
        super.makeMove(destination);
        if (this.isEnPassantSquare(destination)) {
            this.captureEnPassant();
        } else if (this.finder.isDoublePush(destination)) {
            this.setEnPassantSquare();
        } else if (this.isQueenSquare()) {
            this.queenPawn();
        }
    }
    
    undoMove(capturedPieceCode, checkers) {
        if (this.isEnPassantSquare(this.destination)) {
            this.undoCaptureEnPassant();
        } else if (this.finder.isDoublePush(this.destination)) {
            this.forgetEnPassantSquare();
        }
        super.undoMove(capturedPieceCode, checkers);
    }
    
    captureEnPassant() {
        var victimRank = this.finder.getRank(this.destination);
        if (toMove === 'w') {
            victimRank--;
        } else {
            victimRank++;
        }
        document.getElementById(this.finder.getFile(this.destination) + "" + victimRank).innerHTML = "";
    }
    
    undoCaptureEnPassant() {
        var victimRank = this.finder.getRank(this.destination);
        var pawnColour = '';
        if (toMove === 'w') {
            victimRank--;
            pawnColour = 'b';
            
        } else {
            victimRank++;
            pawnColour = 'w';
        }
        document.getElementById(this.finder.getFile(this.destination) + "" + victimRank).innerHTML = pawnColour + 'pawn';
    }
    
}

class SquareReader {
    
    constructor() {
        
    }

    exists(square) {
        return square !== null;
    }

    isOccupiable(square) {
        return PieceReference.getOccupant(square).colour !== toMove;
    }

    isOccupied(square) {
        return square.innerHTML !== '';
    }
    
    getFile(square) {
        return Number(square.id.substring(0, 1));
    }
    
    getRank(square) {
        return Number(square.id.substring(1, 2));
    }
    
}

class MoveRecorder extends SquareReader {
    
    constructor(destinationSquare) {
        super();
        this.startSquare = move.start;
        this.destSquare = destinationSquare;
        this.line = new LogbookHandler().getLogLine();
        this.piece = PieceReference.getOccupant(this.startSquare).piece;
        this.scoreboard = this.getScoreboard();
        this.isCastle = 
                this.piece === 'king' && Math.abs(this.getFile(this.startSquare) - this.getFile(this.destSquare)) === 2;
        this.isCapture = 
                this.isOccupied(this.destSquare) || (move instanceof PawnMove && move.isEnPassantSquare(this.destSquare));
    }
    
    getScoreboard() {
        if (window.outerWidth <= window.outerHeight) {
            return document.getElementById('scoreboardTop');
        }
        return document.getElementById('scoreboardSide');
    }
    
    getMoveSymbol() {
        if (this.isCapture) {
            return 'x';
        }
        return '-';
    }
    
    recordMoveIntro() {
        if (toMove === 'b') { // toMove has already been changed here (-.-')
            this.line.innerHTML = turnCount() + '. ';
        } else {
            this.line.innerHTML += '  ';
        }
    }
    
    recordMove() {
        this.recordMoveIntro();
        var moveDescription;
        if (this.isCastle) {
            moveDescription = this.getCastleDescription();
        } else if (this.piece === 'wPawn' || this.piece === 'bPawn') {
            drawCountdown = 100;
            moveDescription = this.getPawnMoveDescription();
        } else {
            moveDescription = this.getPieceMoveDescription();
        }
        this.line.innerHTML += moveDescription;
    }
    
    getPawnMoveDescription() {
        var description;
        if (this.isCapture) {
            var startCoordinates = this.getCoordinates(this.startSquare);
            var startFile = startCoordinates.substring(0, startCoordinates.length - 1);
            description = startFile + this.getMoveSymbol() + this.getCoordinates(this.destSquare); // Capture notation
        } else {
            description = this.getCoordinates(this.destSquare); // Push notation
        }
        
        var destRank = this.getRank(this.destSquare);
        if (destRank === 8 || destRank === 1) { 
            return description + "=Q"; // Queening notation
        }
        return description;
    }
    
    getPieceMoveDescription() {
        var pieceCode = this.destSquare.innerHTML;
        return pieceCode + this.getCoordinates(this.startSquare) + this.getMoveSymbol() + this.getCoordinates(this.destSquare);
    }
    
    getCastleDescription() {
        if (this.getFile(this.destSquare) === 3) {
            return  'O-O-O';
        }
        return 'O-O';
    }
    
    recordCheck() {
        this.recordMove();
        this.line.innerHTML += '+';
    }
    
    recordMate() {
        this.recordMove();
        this.line.innerHTML += '#';
        var score;
        if (toMove === 'b') { // Needs drawn game shite
            score = '1 - 0';
        } else {
            score = '0 - 1';
        }
    }
    
    displayResult(reason) {
        var scoreboardHTML = this.scoreboard.innerHTML;
        var whitePoints = Number(document.getElementById('whitePoints').innerText);
        var blackPoints = Number(document.getElementById('blackPoints').innerText);
        if (reason === 'Checkmate') {
            if (toMove === 'b') {
                whitePoints += 1;
            } else {
                blackPoints += 1;
            }
        } else {
            whitePoints += 0.5;
            blackPoints += 0.5;
        }
        this.scoreboard.innerText = reason;
        window.setTimeout( 
            function(scoreboard, scoreboardHTML, whitePoints, blackPoints) {
                scoreboard.innerHTML = scoreboardHTML;
                document.getElementById('whitePoints').innerText = whitePoints;
                document.getElementById('blackPoints').innerText = blackPoints;
            },
        2000, this.scoreboard, scoreboardHTML, whitePoints, blackPoints);
    }
    
    getCoordinates(square) {
        var file = '&#' + (this.getFile(square) + 96) + ';';
        return file + this.getRank(square);
    }
    
}

class LogbookHandler {
    
    constructor() {
        this.maxPageLength = 10;
        this.maxPages = this.getMaxPages();
        this.pages = this.getPages();
    }
    
    getPages() {
        return document.getElementsByClassName('logPage');
    }

    getMaxPages() {
        var maxPages = 1;
        var centiPixels = window.outerWidth / 100;
        for (var i = 11; i < centiPixels; i+=2) {
            maxPages++;
        }
        return maxPages;
    }

    redrawLogbooks() {
        if (this.pages.length === 0) {
            return;
        }
        var pagesUsed = this.pages.length;
        var pageContents = [];
        var pageCounter = 1;
        var lastPage;
        do {
            lastPage = this.pages[pagesUsed - pageCounter];
        } while (lastPage.innerHTML === '' && (pageCounter++) < pagesUsed);
        var incomplete = lastPage.classList.contains('incomplete');
        for (pageCounter = 0; pageCounter < pagesUsed; pageCounter++) {
            pageContents[pageCounter] = this.pages[pagesUsed-1 - pageCounter].innerHTML; // Take each <td>'s innerHTML and put it in 'pageContents' in reverse order.
        }
        var booksNeeded = Math.ceil(turnCount() / (this.maxPageLength * this.maxPages));
        document.getElementById('logBooks').innerHTML = ''; // clear logbooks
        while (booksNeeded-- > 0) {
            var newLogbook = this.addLogBook(false);
            var newPages = newLogbook.children;
            pageCounter = 0;
            while (pageCounter < newPages.length) {
                var nextMoves = pageContents.pop();
                if (nextMoves === undefined) {
                    nextMoves = '';
                }
                if (nextMoves === '') {
                    newPages[pageCounter].classList.add('incomplete');
                    if (incomplete) {
                        newPages[pageCounter - 1].classList.add('incomplete');
                        incomplete = false;
                    }
                } else {
                    newPages[pageCounter].innerHTML = nextMoves;
                }
                pageCounter++;
            }
            if (booksNeeded === 0 && incomplete) {
                newPages[pageCounter - 1].classList.add('incomplete');
            }
        }
        this.pages = this.getPages();
    }
    
    addLogBook(isNew) {
        var newLogBook = document.createElement('tr');
        newLogBook.classList.add('logBook');
        document.getElementById('logBooks').appendChild(newLogBook);
        for (var i = 0; i < this.maxPages; i++) {
            var newPage = document.createElement('td');
            newPage.classList.add('logPage');
            if (isNew) {
                newPage.classList.add('incomplete');
            }
            newLogBook.appendChild(newPage);
        }
        return newLogBook;
    }
    
    getLogPage() {
        var i = 0;
        while (i < this.pages.length) {
            var page = this.pages[i];
            if (page.classList.contains('incomplete')) {
                if (moveCount % 2 === 1 && turnCount() % this.maxPageLength === 0) { // End of line && end of page
                    page.classList.remove('incomplete');
                    return page;
                }
                return page;
            }
            i++;
        }
        this.addLogBook(true);
        return this.getLogPage();
    }
    
    getLogLine() {
        var page = this.getLogPage();
        var lines = page.children;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.classList.contains('incomplete')) {
                line.classList.remove('incomplete');
                return line;
            }
        }
        line = document.createElement('div');
        line.classList.add('incomplete');
        return page.appendChild(line);
    }
}

class Finder extends SquareReader {
    
    constructor(square, move) {
        super();
        this.start = square;
        this.move = move;
    }

    getSquareStepper(direction) {
        var movement = {
           rank: 0,
           file: 0
        };
        var movementDirector = {
            'N': function() { movement.rank++; },
            'E': function() { movement.file++; },
            'S': function() { movement.rank--; },
            'W': function() { movement.file--; }
        };
        for (var position = 0; position < direction.length; position++) {
            movementDirector[direction.charAt(position)]();
        }
        return function(currentFile, currentRank) {
            var nextFile = currentFile + movement.file;
            var nextRank = currentRank + movement.rank;
            return document.getElementById(nextFile + "" + nextRank);
        };
    }
    
    getDirection(start, destination) {        
        var vertical = "";
        if (this.getRank(start) < this.getRank(destination)) {
            vertical = "N";
        } else if (this.getRank(start) > this.getRank(destination)) {
            vertical = "S";
        }
        var horizontal = "";
        if (this.getFile(start) < this.getFile(destination)) {
            horizontal = "E";
        } else if (this.getFile(start) > this.getFile(destination)) {
            horizontal = "W";
        }
        return vertical + horizontal;
    }

    getOppositeDirection(direction) {
        var opposites = {
            'N':'S',
            'E':'W',
            'S':'N',
            'W':'E'
        };
        var opposite = '';
        for (var position = 0; position < direction.length; position++) {
            opposite += opposites[direction.charAt(position)];
        }
        return opposite;
    }
    
    getLegalDirections() {
        var pinFinder = new PinFinder(this.start);
        var movementDirections = PieceReference.getMovement(this.start).directions;
        if (pinFinder.isPinned(this.start)) {
            var legalDirections = [];
            var pinDirections = [this.getDirection(this.start, pinFinder.getKingSquare())];
            pinDirections.push(this.getOppositeDirection(pinDirections[0]));
            for (var i = 0; i < movementDirections.length; i++) {
                switch (movementDirections[i]) {
                    case pinDirections[0]:
                        legalDirections.push(pinDirections[0]);
                    case pinDirections[1]:
                        legalDirections.push(pinDirections[1]);
                }
            }
            return legalDirections;
        }
        return movementDirections;
    }
    
}

class PawnMoveFinder extends Finder {
    
    constructor(square, move) {
        super(square, move);
    }

    getLegalDestinations() {
        var destinations = [];
        var legalDirections = this.getLegalDirections();
        while (legalDirections.length > 0) {
            var direction = legalDirections.pop();
            if (direction.length === 1) {
                destinations = destinations.concat(this.getPushableSquares(direction));
            } else {
                destinations = destinations.concat(this.getCaptureSquare(direction));
            }
        }
        return destinations;
    }
    
    getLegalDirections() {
        if (toMove === 'w') {
            return super.getLegalDirections('wPawn');
        } else {
            return super.getLegalDirections('bPawn');
        };
    }
    
    getPushableSquares(direction) {
        var squareStepper = this.getSquareStepper(direction);
        var getPushableSquare = function(square, squareStepper, finder) {
            var pushSquare = squareStepper(finder.getFile(square), finder.getRank(square));
            if (finder.isOccupied(pushSquare)) {
                return [];
            }
            return [pushSquare];
        };
        var pushSquares = getPushableSquare(this.start, squareStepper, this);
        if (pushSquares.length === 1 && this.canDoublePush()) {
            pushSquares = pushSquares.concat(getPushableSquare(pushSquares[0], squareStepper, this));
        }
        return pushSquares;
    }
    
    canDoublePush() {
        if (toMove === 'w') {
            return this.getRank(this.start) === 2;
        } else {
            return this.getRank(this.start) === 7;
        }
    }
    
    getCaptureSquare(direction) {
        var squareStepper = this.getSquareStepper(direction);
        var captureSquare = squareStepper(this.getFile(this.start), this.getRank(this.start));
        if (this.exists(captureSquare)) {
            if ((this.isOccupied(captureSquare) && PieceReference.getOccupant(captureSquare).colour !== toMove) || this.move.isEnPassantSquare(captureSquare)) {
                return [captureSquare];
            }
        }
        return [];
    }
        
    isDoublePush(destination) {
        if (toMove === 'w') {
            return this.getRank(this.start) === 2 && this.getRank(destination) === 4;
        } else {
            return this.getRank(this.start) === 7 && this.getRank(destination) === 5;
        }
    }
    
}

class PieceMoveFinder extends Finder {
    
    constructor(square, move) {
        super(square, move);
    }
    
    getLegalDestinations() {
        var movement = PieceReference.getMovement(this.start);
        var legalDirections = super.getLegalDirections();
        var destinations = [];
        for (var i = 0; i < legalDirections.length; i++) {
            var subDestinations = this.getDestinations(this.start, movement.type, this.getSquareStepper(legalDirections[i]));
            destinations = destinations.concat(subDestinations);
        }
        return destinations;
    }

    getDestinations(currentSquare, movementType, squareStepper) {
        var destinations = [];
        var nextSquare = squareStepper(this.getFile(currentSquare), this.getRank(currentSquare));
        if (this.exists(nextSquare) && this.isOccupiable(nextSquare)) {
            destinations.push(nextSquare);
            if (movementType === 'walk') {
                if (!this.isOccupied(nextSquare)) {
                    destinations = destinations.concat(this.getDestinations(nextSquare, movementType, squareStepper));
                }
            }
        }
        return destinations;
    }
        
}

class KingMoveFinder extends PieceMoveFinder {
    
    constructor(kingSquare, move) {
        super(kingSquare, move);
        this.attackFinder = new AttackFinder();
        if (kingSquare === undefined) {
            this.start = this.attackFinder.getKingSquare();
        }
    }
    
    getKing() {
        return this.start;
    }
    
    getLegalDestinations() {
        var legalDestinations = super.getLegalDestinations();
        var kingHTML = this.start.innerHTML;
        this.start.innerHTML = "";
        this.attackFinder.removeAttackedSquares(legalDestinations);
        this.start.innerHTML = kingHTML;
        this.addCastleSquares(legalDestinations);
        return legalDestinations;
    }
    
    addCastleSquares(destinations) {
        var sideStep;
        var sideSteppers = {
            east:this.getSquareStepper('E'),
            west:this.getSquareStepper('W')
        };
        if (this.start.classList.contains("unmoved") && !this.isChecked()) {
            for (var stepper in sideSteppers) {
                sideStep = sideSteppers[stepper](this.getFile(this.start), this.getRank(this.start));
                for (var i = 0; i < destinations.length; i++) {
                    if (destinations[i] === sideStep) {
                        sideStep = sideSteppers[stepper](this.getFile(sideStep), this.getRank(sideStep));
                        this.attackFinder.findPiece(this.start, sideSteppers[stepper], 'walk');
                        var unmovedRook = this.attackFinder.findPiece(this.start, sideSteppers[stepper], 'walk');
                        if (!this.attackFinder.isAttacked(sideStep) && this.exists(unmovedRook) && unmovedRook.classList.contains('unmoved')) {
                            destinations.unshift(sideStep);
                            i++;
                        }
                    }
                }
            }
        }
    }
    
    isChecked() {
        return this.attackFinder.isAttacked(this.start);
    }
    
    getCheckers() {
        return this.attackFinder.getAttackers(this.start);
    }
    
    isMated() {
        // Assume is attacked.
        var checker = move.getCheckers();
        return !((checker.length === 1 && this.isCapturable(checker[0])) || this.hasEscapeSquare() || this.hasPotentialShield());
    }
    
    isCapturable(enemy) {
        var attackers = this.enemyIsAttacked(enemy);
        while (attackers.length > 0) {
            var attacker = attackers.pop();
            if (PieceReference.getOccupant(attacker).piece !== 'king') {    // hasEscapeSquare checks if a piece attacked by the king can be taken.
                var pinFinder = new PinFinder(attacker);
                if (!pinFinder.isPinned()) {
                    return true;
                }
            }
        }
        return false;
    }
    
    enemyIsAttacked(enemy) {
        var tempToMove = toMove;
        toMove = PieceReference.getOccupant(enemy).colour;
        var attackers = this.attackFinder.getAttackers(enemy);
        toMove = tempToMove;
        return attackers;
    }
    
    hasEscapeSquare() {
        var kingDirections = PieceReference.getMovement('king').directions;
        while (kingDirections.length > 0) {
            var squareStepper = this.getSquareStepper(kingDirections.pop());
            var escapeSquare = squareStepper(this.getFile(this.start), this.getRank(this.start));
            if (this.exists(escapeSquare) && this.isOccupiable(escapeSquare)) {
                var piece = escapeSquare.innerHTML;
                escapeSquare.innerHTML = '';
                if (!this.attackFinder.isAttacked(escapeSquare)) {
                    escapeSquare.innerHTML = piece;
                    return true;
                }
                escapeSquare.innerHTML = piece;
            }
        }
        return false;
    }
    
    hasPotentialShield() {
        var checkers = move.getCheckers();
        if (checkers.length < 2) {
            var checker = checkers[0];
            if (PieceReference.getMovement(checker).type === 'walk') {
                var blockSquares = this.getBlockSquares(checker);
                while (blockSquares.length > 0) {
                    if (this.isShieldable(blockSquares.pop())) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    getBlockSquares(checker) {
        var blockSquares = [];
        var squareStepper = this.getSquareStepper(this.getDirection(checker, this.start));
        var nextSquare = squareStepper(this.getFile(checker), this.getRank(checker));
        while (PieceReference.getOccupant(nextSquare).piece !== 'king') {
            blockSquares.push(nextSquare);
            var nextSquare = squareStepper(this.getFile(nextSquare), this.getRank(nextSquare));
        }
        return blockSquares;
    }
    
    isShieldable (square) {
        var movementTypes = {
            walk:{type:'walk', directions:['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW']},
            step:{type:'step', directions:['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW', 'NNE', 'ENE', 'ESE', 'SSE', 'SSW', 'WSW', 'WNW', 'NNW']}
        };
        var type, movement, direction, shieldSquare, shield, shieldMovement, blockDirection;
        for (var type in movementTypes) {
            movement = movementTypes[type];
            while (movement.directions.length > 0) {
                direction = movement.directions.pop();
                shieldSquare = this.attackFinder.findPiece(square, this.getSquareStepper(direction), movement.type);
                if (this.exists(shieldSquare)) {
                    shield = PieceReference.getOccupant(shieldSquare);
                    if (shield.piece !== 'king') {
                        shieldMovement = PieceReference.getMovement(shield.piece);
                        blockDirection = this.getOppositeDirection(direction);
                        if (shield.colour === toMove && shieldMovement.directions.indexOf(blockDirection) !== -1 && !(new PinFinder(shieldSquare)).isPinned()) {
                            if (PieceReference.holdsPawn(shieldSquare)) {
                                if (direction === 'N' || direction === 'S') {
                                    switch(Math.abs(this.getRank(shieldSquare) - this.getRank(square))) {
                                        case 1:
                                            return true;
                                        case 2:
                                            if (new PawnMoveFinder(shieldSquare).canDoublePush()) {
                                                return true;
                                            }
                                        default:
                                            continue;
                                    }
                                } else {
                                    continue;
                                }
                            } else if (movement.type === shieldMovement.type) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
    
}

class PieceFinder extends Finder {
    
    constructor(square) {
        super(square);
    }
    
    findPiece(start, squareStepper, type) {
        var nextSquare = start;
        do {
            nextSquare = squareStepper(this.getFile(nextSquare), this.getRank(nextSquare));
            if (!this.exists(nextSquare) || this.isOccupied(nextSquare)) {
                break;
            }
        } while (type === 'walk')
        return nextSquare;
    }
    
    getKingSquare() {
        var i = 0;
        while (true) {
            var occupant = PieceReference.getOccupant(squares[i]);
            if (occupant.piece === 'king' && occupant.colour === toMove) {
                return squares[i];
            }
            i++;
        }
    }
    
}

class PinFinder extends PieceFinder {
    
    constructor(square) {
        super(square);
    }
    
    getPinnableDirections() {
        return PieceReference.getMovement('queen').directions;
    }
    
    getPinLines() {
        var pinLines = this.getPinnableDirections();
        for (var i = 0; i < pinLines.length; i++) {
            var direction = pinLines[i];
            var squareStepper = this.getSquareStepper(direction);
            var pinnedPiece = this.findPiece(this.getKingSquare(), squareStepper, 'walk');
            if (!this.exists(pinnedPiece) || !this.isPinnedSpecific(pinnedPiece, direction)) {
                pinLines.splice(i--, 1);
            }
        }
        return pinLines;
    }
    
    isPinned() {
        var pinnableDirections = this.getPinnableDirections();
        while (pinnableDirections.length > 0) {
            var direction = pinnableDirections.pop();
            if (this.isKingShield(this.start, direction)) {
                return this.isPinnedSpecific(this.start, this.getOppositeDirection(direction));
            }
        }
        return false;
    }
    
    isPinnedSpecific(piece, direction) {
        var squareStepper = this.getSquareStepper(direction);           // Search for opposing pieces that can walk along the given direction to this.start.
        var potentialPinner = PieceReference.getOccupant(this.findPiece(piece, squareStepper, 'walk'));
        var attackDirection = this.getOppositeDirection(direction);
        if (
            this.exists(potentialPinner) && 
            potentialPinner.colour !== toMove && 
            this.canWalk(potentialPinner.piece, attackDirection) &&     // If one is found, return true if this.start is the only piece between its king and the found piece.
            this.isKingShield(piece, attackDirection)
        ) {
            return true;
        }
        return false;
    }
    
    isKingShield(piece, direction) {
        var shieldHolder = this.findPiece(piece, this.getSquareStepper(direction), 'walk');
        if (this.exists(shieldHolder)) {
            shieldHolder = PieceReference.getOccupant(shieldHolder);
            if (shieldHolder.piece === 'king' && shieldHolder.colour === toMove) {
                return true;
            }
        }
        return false;
    }
    
    canWalk(enemyPiece, direction) {
        var movement = PieceReference.getMovement(enemyPiece);
        if (movement.type === 'walk') {
            var sightDirections = movement.directions;
            return sightDirections.indexOf(direction) !== -1;
        }
        return false;
    }
    
}

class AttackFinder extends PieceFinder {
    
    constructor() {
        super(undefined);
    }
    
    removeAttackedSquares(squareList) {
        for (var i = 0; i < squareList.length; i++) {
            if (this.isAttacked(squareList[i])) {
                squareList.splice(i--, 1);
            }
        }
    }
    
    isAttacked(square) {
        return this.getAttackers(square).length > 0;
    }
    
    getAttackers (square) {
        var movementTypes = {
            walk:{type:'walk', directions:['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW']},
            step:{type:'step', directions:['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW', 'NNE', 'ENE', 'ESE', 'SSE', 'SSW', 'WSW', 'WNW', 'NNW']}
        };
        var attackers = [];
        var type, movement, direction, attackerSquare, attacker, attackerMovement;
        for (var type in movementTypes) {
            movement = movementTypes[type];
            while (movement.directions.length > 0) {
                direction = movement.directions.pop();
                attackerSquare = this.findPiece(square, this.getSquareStepper(direction), movement.type);
                if (this.exists(attackerSquare)) {
                    attacker = PieceReference.getOccupant(attackerSquare);
                    attackerMovement = PieceReference.getMovement(attacker.piece);
                    if (attacker.colour !== toMove && attackerMovement.directions.indexOf(this.getOppositeDirection(direction)) !== -1) {
                        if ((attacker.piece === 'wPawn' && direction === 'S') || (attacker.piece === 'bPawn' && direction === 'N')) {
                            continue;
                        }
                        if (movement.type === attackerMovement.type) {
                            attackers.push(attackerSquare);
                        } 
                    }
                }
            }
        }
        return attackers;
    }
    
}

class AestheticsManager {
    
    static prepAnimation(square) {
        square.classList.remove('rejected');
        square.classList.remove('accepted');
    }

    static flash(accepted, square) {
        var className;
        if (accepted) {
            className = 'accepted';
        } else {
            className = 'rejected';
        }
        square.classList.remove(className);
        window.setTimeout( 
            function(square, className) {
                square.classList.add(className);
            },
        0, square, className);
    }

    static flushRejected() {
        var rejectedSquares = document.getElementsByClassName('rejected');
        while (rejectedSquares.length > 0) {
            rejectedSquares[0].classList.remove('rejected');
        }
    }
    
    static flushAccepted(square) {
        square.classList.remove('accepted');
        void square.offsetWidth;
    }

}

class PieceReference {

    static getOccupant(square) {
        if (square === null) return null;
        switch(square.innerHTML) {
            case '\u2654':
                return {piece:'king', colour:'w'};
            case '\u2655':
                return {piece:'queen', colour:'w'};
            case '\u2656':
                return {piece:'rook', colour:'w'};
            case '\u2657':
                return {piece:'bishop', colour:'w'};
            case '\u2658':
                return {piece:'knight', colour:'w'};
            case '\u2659':
                return {piece:'wPawn', colour:'w'};
            case '\u265A':
                return {piece:'king', colour:'b'};
            case '\u265B':
                return {piece:'queen', colour:'b'};
            case '\u265C':
                return {piece:'rook', colour:'b'};
            case '\u265D':
                return {piece:'bishop', colour:'b'};
            case '\u265E':
                return {piece:'knight', colour:'b'};
            case '\u265F':
                return {piece:'bPawn', colour:'b'};
            case '':
                return {piece:'', colour:''};
        }
    }

    static getMovement(piece) {
        switch(piece)  {
            case 'king':
                return {directions:['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW'], type:'step'};
            case 'queen':
                return {directions:['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW'], type:'walk'};
            case 'rook':
                return {directions:['N', 'E', 'S', 'W'], type:'walk'};
            case 'bishop':
                return {directions:['NE', 'SE', 'SW', 'NW'], type:'walk'};
            case 'knight':
                return {directions:['NNE', 'ENE', 'ESE', 'SSE', 'SSW', 'WSW', 'WNW', 'NNW'], type:'step'};
            case 'wPawn':
                return {directions:['NW', 'N', 'NE'], type:'step'};
            case 'bPawn':
                return {directions:['SW', 'S', 'SE'], type:'step'};
            case '':
                return {directions:[], type:''};
            default:
                return PieceReference.getMovement(PieceReference.getOccupant(piece).piece);
        };
    }
    
    static holdsPawn(square) {
        var pieceCode = square.innerHTML;
        return pieceCode === '\u2659' || pieceCode === '\u265F';
    }
    
}

var moveCount;
var turnCount = function() {
    return Math.ceil(moveCount / 2);
};
var toMove;
var move;
var drawCountdown;
var lastFivePositions;
var initialBoardState = document.getElementById('board').innerText;
var squares;

initialiseVariables();
redrawPage();

window.addEventListener('resize', function() {
    redrawPage();
    new LogbookHandler().redrawLogbooks();
});

