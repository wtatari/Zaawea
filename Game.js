// Game.js

import { BOARD_SIZE } from './Constants.js';
import { Triangle, Square, Hexagon, Octagon } from './Piece.js';
import { getAIMove } from './AI.js'; // Import the AI module

// Game State Variables
let selectedPiece = null;
let selectedPosition = null;
let highlightedMoves = [];
let currentPlayer = 'red'; // Game starts with red player
let moveHistory = [];
let gameStateHistory = [];
let gameMode = 'human-vs-ai'; // Default to human vs AI mode
let aiColor = 'black'; // AI plays as black
let winByMergingOctagons = false; // Initialize as false

// Initialize the Board
let board = initializeBoard();

// Helper Functions

// Function to get piece letter for move recording
function getPieceLetter(piece) {
    switch (piece.shape) {
        case 'triangle': return 'T';
        case 'square': return 'S';
        case 'hexagon': return 'H';
        case 'octagon': return 'O';
        default: return '';
    }
}

// Toggle for "Allow win by merging octagons"
document.getElementById('toggle-merge-win').addEventListener('change', function(event) {
    winByMergingOctagons = event.target.checked;
    console.log("Allow win by merging: ", winByMergingOctagons);
});

// Helper function to convert row and col to algebraic notation (like 'a8', 'h1')
function convertToAlgebraic(row, col) {
    const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const algebraicCol = columns[col];
    const algebraicRow = 8 - row; // Adjust for chess-like notation
    return `${algebraicCol}${algebraicRow}`;
}

// Function to save the current state of the game for undo purposes
function saveCurrentGameState() {
    const currentBoard = board.map(row => row.map(piece => {
        if (piece) {
            return { color: piece.color, shape: piece.shape };
        }
        return null;
    }));
    gameStateHistory.push({
        board: currentBoard,
        moveHistory: [...moveHistory],
        currentPlayer: currentPlayer,
    });
}

// Function to initialize the board with pieces
function initializeBoard() {
    return Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => {
            // Black pieces start at top
            if (row === 0 && col === 4) return new Octagon('black'); // Black octagon at the 1st row, 5th tile
            if (row < 2) return new Triangle('black');
            
            // Red pieces start at bottom
            if (row === 7 && col === 3) return new Octagon('red');   // Red octagon at the 8th row, 4th tile
            if (row > 5) return new Triangle('red');

            return null;
        })
    );
}

// Function to check if a player has won by merging two octagons
function checkWinByMergingOctagons(piece) {
    // Ensure it's only octagons and the rule is enabled
    if (!(piece instanceof Octagon) || !winByMergingOctagons) return;

    const octagonCount = board.flat().filter(tile => tile instanceof Octagon && tile.color === piece.color).length;

    // The player wins only when there's exactly 1 octagon left after the merge
    if (octagonCount === 1) {  
        displayWinMessage(`${piece.color.toUpperCase()} player`);
    }
}

// Function to check if a player has lost by losing all their octagons
function checkLoseCondition() {
    const redOctagons = board.flat().filter(tile => tile instanceof Octagon && tile.color === 'red').length;
    const blackOctagons = board.flat().filter(tile => tile instanceof Octagon && tile.color === 'black').length;

    const checkStatusDiv = document.getElementById('check-status');

    if (redOctagons === 0) {
        checkStatusDiv.textContent = 'BLACK player wins! RED has no octagons left.';
        checkStatusDiv.classList.add('win');
        checkStatusDiv.classList.remove('check', 'checkmate');
        addEndGameOptions(); // Provide options to Undo or Restart
    } else if (blackOctagons === 0) {
        checkStatusDiv.textContent = 'RED player wins! BLACK has no octagons left.';
        checkStatusDiv.classList.add('win');
        checkStatusDiv.classList.remove('check', 'checkmate');
        addEndGameOptions(); // Provide options to Undo or Restart
    }
}

// Function to render the board
function renderBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';

    board.forEach((row, rowIndex) => {
        row.forEach((tile, colIndex) => {
            const div = document.createElement('div');
            div.classList.add('tile', (rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark');
            div.dataset.row = rowIndex;
            div.dataset.col = colIndex;

            // Only add event listener if it's human's turn or in human vs human mode
            if (gameMode === 'human-vs-human' || currentPlayer !== aiColor) {
                div.addEventListener('click', handleTileClick);
            }

            if (tile) {
                const text = document.createElement('span');
                text.className = tile.getClass();
                text.textContent = tile.getSymbol();
                div.appendChild(text);
            }

            if (highlightedMoves.some(move => move.row === rowIndex && move.col === colIndex)) {
                div.classList.add('selected');
            }

            gameBoard.appendChild(div);
        });
    });

    // Update current player display
    document.getElementById('current-player').textContent = `Current Player: ${currentPlayer.toUpperCase()}`;

    // If it's the AI's turn and the game mode is human vs AI, make the AI move
    if (gameMode === 'human-vs-ai' && currentPlayer === aiColor) {
        // Delay the AI move slightly to simulate thinking time
        setTimeout(() => {
            makeAIMove();
        }, 500);
    }
}

// Handle tile click
function handleTileClick(event) {
    const row = parseInt(event.currentTarget.dataset.row);
    const col = parseInt(event.currentTarget.dataset.col);
    selectPiece(row, col);
}

// Select and move pieces
function selectPiece(row, col) {
    const piece = board[row][col];

    // In human vs AI mode, prevent the human from selecting the AI's pieces
    if (gameMode === 'human-vs-ai' && currentPlayer === aiColor) {
        return; // It's the AI's turn, so ignore human input
    }

    if (selectedPiece) {
        // Move or merge selected piece
        const move = highlightedMoves.find(move => move.row === row && move.col === col);

        if (move) {
            const from = selectedPosition;  // Save the current position for move recording

            if (move.merge) {
                board[row][col] = move.merge;
                board[selectedPosition.row][selectedPosition.col] = null;
                checkWinByMergingOctagons(move.merge);
            } else if (move.eat) {
                if (move.both) {
                    board[row][col] = null;
                    board[selectedPosition.row][selectedPosition.col] = null;
                } else {
                    board[row][col] = selectedPiece;
                    board[selectedPosition.row][selectedPosition.col] = null;
                }
            } else {
                board[row][col] = selectedPiece;
                board[selectedPosition.row][selectedPosition.col] = null;
            }

            // Record the move
            recordMove(selectedPiece, from, { row, col });

            // Switch player after a successful move
            currentPlayer = currentPlayer === 'red' ? 'black' : 'red';

            // Save current state for undo
            saveCurrentGameState();

            // After every move, check if the current player is in check or checkmate
            if (isCheckmate(currentPlayer)) {
                displayCheckmateMessage(currentPlayer);
            } 
            // Check if the player is in Check
            else if (isOctagonUnderAttack(currentPlayer)) {
                displayCheckMessage(currentPlayer);
            } 
            // Clear the check-status if no check
            else {
                clearCheckStatus();
            }

            // Check if any player has lost all octagons
            checkLoseCondition();
        }

        selectedPiece = null;
        selectedPosition = null;
        highlightedMoves = [];
    } else if (piece && piece.color === currentPlayer) {
        // Select a new piece and highlight its moves
        selectedPiece = piece;
        selectedPosition = { row, col };

        // If the player is in check, filter moves to only those that can save the octagon
        if (isOctagonUnderAttack(currentPlayer)) {
            highlightedMoves = getLegalMovesThatSaveOctagon(piece, row, col);
        } else {
            highlightedMoves = selectedPiece.getValidMoves(row, col, board);
        }
    }

    renderBoard();
}

// Function to record moves in algebraic notation
function recordMove(piece, from, to) {
    const pieceLetter = getPieceLetter(piece); // Convert piece to its letter
    const fromPosition = convertToAlgebraic(from.row, from.col); // e.g., 'a8'
    const toPosition = convertToAlgebraic(to.row, to.col); // e.g., 'b7'
    moveHistory.push(`${pieceLetter}${fromPosition}${toPosition}`);
}

// Function for the AI to make its move
function makeAIMove() {
    const aiMove = getAIMove(board, aiColor);
    if (aiMove) {
        const { from, to, moveDetails, piece } = aiMove;

        // Execute the move
        if (moveDetails.merge) {
            board[to.row][to.col] = moveDetails.merge;
            board[from.row][from.col] = null;
            checkWinByMergingOctagons(moveDetails.merge);
        } else if (moveDetails.eat) {
            if (moveDetails.both) {
                board[to.row][to.col] = null;
                board[from.row][from.col] = null;
            } else {
                board[to.row][to.col] = piece;
                board[from.row][from.col] = null;
            }
        } else {
            board[to.row][to.col] = piece;
            board[from.row][from.col] = null;
        }

        // Record the move
        recordMove(piece, from, to);

        // Switch player after AI move
        currentPlayer = currentPlayer === 'red' ? 'black' : 'red';

        // Save current state for undo
        saveCurrentGameState();

        // After AI makes a move, check if the human player is in check or checkmate
        const humanColor = aiColor === 'red' ? 'black' : 'red';

        if (isCheckmate(humanColor)) {
            displayCheckmateMessage(humanColor);
        } else if (isOctagonUnderAttack(humanColor)) {
            displayCheckMessage(humanColor);
        } else {
            clearCheckStatus();
        }

        // Check if any player has lost all octagons
        checkLoseCondition();

        // Render the board after AI move
        renderBoard();
    } else {
        // AI has no valid moves, player wins
        displayWinMessage('You');
        resetGame();
    }
}

// Undo last move
function undoLastMove() {
    if (gameMode === 'human-vs-ai') {
        // In human vs AI mode, undo the last two moves (AI's move and human's move)
        if (gameStateHistory.length > 2) {
            // Remove the last two states
            gameStateHistory.pop(); // Remove AI's move
            gameStateHistory.pop(); // Remove human's move
            const previousState = gameStateHistory[gameStateHistory.length - 1];

            // Restore the board
            board = previousState.board.map(row => row.map(savedPiece => {
                if (savedPiece) {
                    switch (savedPiece.shape) {
                        case 'triangle':
                            return new Triangle(savedPiece.color);
                        case 'square':
                            return new Square(savedPiece.color);
                        case 'hexagon':
                            return new Hexagon(savedPiece.color);
                        case 'octagon':
                            return new Octagon(savedPiece.color);
                        default:
                            return null;
                    }
                } else {
                    return null;
                }
            }));

            moveHistory = previousState.moveHistory;
            currentPlayer = previousState.currentPlayer;

            // Re-render the board
            renderBoard();

            // Update the current player display
            document.getElementById('current-player').textContent = `Current Player: ${currentPlayer.toUpperCase()}`;

            // Clear any status message
            clearCheckStatus();
        } else {
            displayCannotUndoMessage();
        }
    } else {
        // In human vs human mode, undo the last move
        if (gameStateHistory.length > 1) {
            gameStateHistory.pop(); // Remove the last state
            const previousState = gameStateHistory[gameStateHistory.length - 1];

            // Restore the board
            board = previousState.board.map(row => row.map(savedPiece => {
                if (savedPiece) {
                    switch (savedPiece.shape) {
                        case 'triangle':
                            return new Triangle(savedPiece.color);
                        case 'square':
                            return new Square(savedPiece.color);
                        case 'hexagon':
                            return new Hexagon(savedPiece.color);
                        case 'octagon':
                            return new Octagon(savedPiece.color);
                        default:
                            return null;
                    }
                } else {
                    return null;
                }
            }));

            moveHistory = previousState.moveHistory;
            currentPlayer = previousState.currentPlayer;

            // Re-render the board
            renderBoard();

            // Update the current player display
            document.getElementById('current-player').textContent = `Current Player: ${currentPlayer.toUpperCase()}`;

            // Clear any status message
            clearCheckStatus();
        } else {
            displayCannotUndoMessage();
        }
    }
}

// Display Checkmate Message with Options
function displayCheckmateMessage(playerColor) {
    const checkStatusDiv = document.getElementById('check-status');
    if (gameMode === 'human-vs-ai' && playerColor !== aiColor) {
        // Human is checkmated
        checkStatusDiv.textContent = `${playerColor.toUpperCase()} is in checkmate! AI wins!`;
    } else if (gameMode === 'human-vs-human') {
        checkStatusDiv.textContent = `${playerColor.toUpperCase()} is in checkmate!`;
    } else {
        // AI is checkmated
        checkStatusDiv.textContent = `${playerColor.toUpperCase()} is in checkmate! You win!`;
    }

    checkStatusDiv.classList.add('checkmate');
    checkStatusDiv.classList.remove('check', 'win');

    // Add Undo and Restart buttons
    addEndGameOptions();
}

// Display Check Message
function displayCheckMessage(playerColor) {
    const checkStatusDiv = document.getElementById('check-status');
    checkStatusDiv.textContent = `${playerColor.toUpperCase()} is in check!`;
    checkStatusDiv.classList.add('check');
    checkStatusDiv.classList.remove('checkmate', 'win');
}

// Display Win Message
function displayWinMessage(winner) {
    const checkStatusDiv = document.getElementById('check-status');
    checkStatusDiv.textContent = `${winner} wins!`;
    checkStatusDiv.classList.add('win');
    checkStatusDiv.classList.remove('check', 'checkmate');
    addEndGameOptions();
}

// Clear Check Status
function clearCheckStatus() {
    const checkStatusDiv = document.getElementById('check-status');
    checkStatusDiv.textContent = '';
    checkStatusDiv.classList.remove('check', 'checkmate', 'win');
}

// Add Undo and Restart Options after Checkmate or Win

// Get Legal Moves That Save the Octagon (Only moves that resolve the check)
function getLegalMovesThatSaveOctagon(piece, row, col) {
    const allMoves = piece.getValidMoves(row, col, board);
    const legalMoves = [];

    allMoves.forEach(move => {
        // Simulate the move
        const simulatedBoard = deepCopyBoard(board);
        applyMove(simulatedBoard, { from: { row, col }, to: move, moveDetails: move, piece });

        // Check if after the move, the player's octagon is still under attack
        if (!isOctagonUnderAttack(currentPlayer, simulatedBoard)) {
            legalMoves.push(move);
        }
    });

    return legalMoves;
}

// Function to display messages when unable to undo further
function displayCannotUndoMessage() {
    const checkStatusDiv = document.getElementById('check-status');
    checkStatusDiv.textContent = "Cannot undo any further!";
    checkStatusDiv.classList.add('check');
    checkStatusDiv.classList.remove('checkmate', 'win');
}

// Function to clone the board for simulation
function deepCopyBoard(board) {
    return board.map(row => row.map(piece => {
        if (piece) {
            // Clone the piece
            return clonePiece(piece);
        }
        return null;
    }));
}

// Function to apply a move to a board (used for simulation)
function applyMove(board, move) {
    const { from, to, moveDetails, piece } = move;

    if (moveDetails.merge) {
        board[to.row][to.col] = moveDetails.merge;
        board[from.row][from.col] = null;
    } else if (moveDetails.eat) {
        if (moveDetails.both) {
            board[to.row][to.col] = null;
            board[from.row][from.col] = null;
        } else {
            board[to.row][to.col] = piece;
            board[from.row][from.col] = null;
        }
    } else {
        board[to.row][to.col] = piece;
        board[from.row][from.col] = null;
    }
}

// Function to clone a piece
function clonePiece(piece) {
    // Use Object.create to preserve the prototype chain
    const clonedPiece = Object.create(Object.getPrototypeOf(piece));
    // Copy over the properties
    Object.assign(clonedPiece, piece);
    return clonedPiece;
}

// Find the position of a specific piece on the board
function findPiecePosition(piece, boardToSearch = board) {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (boardToSearch[row][col] === piece) {
                return { row, col };
            }
        }
    }
    return null;
}

// Function to check if a player's octagon is under attack
function isOctagonUnderAttack(playerColor, boardToCheck = board) {
    // Find the player's remaining octagon
    const octagon = boardToCheck.flat().find(piece => piece instanceof Octagon && piece.color === playerColor);

    if (!octagon) return false; // No octagon means no check condition

    // Get octagon position
    const octagonPosition = findPiecePosition(octagon, boardToCheck);

    if (!octagonPosition) return false; // Octagon not found on the board

    // Get all opponent pieces
    const opponentColor = playerColor === 'red' ? 'black' : 'red';
    const opponentPieces = boardToCheck.flat().filter(piece => piece && piece.color === opponentColor);

    // Check if any opponent piece can capture the octagon
    for (const opponentPiece of opponentPieces) {
        const opponentPosition = findPiecePosition(opponentPiece, boardToCheck);
        if (!opponentPosition) continue;

        const validMoves = opponentPiece.getValidMoves(opponentPosition.row, opponentPosition.col, boardToCheck);

        // If any valid move can eat the octagon, it's a check
        if (validMoves.some(move => move.eat && move.row === octagonPosition.row && move.col === octagonPosition.col)) {
            return true;
        }
    }

    return false; // No threats to the octagon
}

// Function to determine if a player is in checkmate
function isCheckmate(playerColor) {
    // First, check if the player is in check
    if (!isOctagonUnderAttack(playerColor)) return false; // Not in check, so no checkmate

    // Get the current player's pieces
    const playerPieces = board.flat().filter(piece => piece && piece.color === playerColor);

    // For each of the player's pieces, check if they have any valid moves
    for (const piece of playerPieces) {
        const piecePosition = findPiecePosition(piece);
        if (!piecePosition) continue;

        const validMoves = piece.getValidMoves(piecePosition.row, piecePosition.col, board);

        // Simulate each move and check if it removes the check
        for (const move of validMoves) {
            const simulatedBoard = deepCopyBoard(board);

            // Apply the move on the simulated board
            applyMove(simulatedBoard, { from: piecePosition, to: move, moveDetails: move, piece });

            // Check if the player is still in check after the move
            if (!isOctagonUnderAttack(playerColor, simulatedBoard)) {
                return false; // Found a move that can save the octagon, so not checkmate
            }
        }
    }

    return true; // No valid moves to prevent capture, checkmate!
}

// Function to reset the game
function resetGame() {
    selectedPiece = null;
    selectedPosition = null;
    highlightedMoves = [];
    currentPlayer = 'red';
    board = initializeBoard();
    gameStateHistory = []; // Clear the game state history
    moveHistory = [];      // Clear the move history
    clearCheckStatus();    // Clear any status message and remove classes
    saveCurrentGameState(); // Save the initial state
    renderBoard();
}


// Function to add event listeners for buttons (if not using dynamic buttons)
document.getElementById('undo-btn').addEventListener('click', undoLastMove);
document.getElementById('reset-btn').addEventListener('click', resetGame);

// Function to add event listener to select game mode
document.getElementById('mode-select').addEventListener('change', function(event) {
    gameMode = event.target.value;
    resetGame();
});

// Function to display end-game options (Undo and Restart)
function addEndGameOptions() {
    const checkStatusDiv = document.getElementById('check-status');

    // Check if buttons already exist to prevent duplicates
    if (document.getElementById('end-game-options')) return;

    // Create a container for buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'end-game-options';
    buttonContainer.classList.add('mt-2');

    // Create Undo Button
    const undoButton = document.createElement('button');
    undoButton.textContent = 'Undo Last Move';
    undoButton.classList.add('btn', 'btn-warning', 'btn-sm', 'mr-2');
    undoButton.addEventListener('click', () => {
        undoLastMove();
        // Remove the buttons after undo
        buttonContainer.remove();
    });

    // Create Restart Button
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Restart Game';
    restartButton.classList.add('btn', 'btn-danger', 'btn-sm');
    restartButton.addEventListener('click', () => {
        resetGame();
        // Remove the buttons after restart
        buttonContainer.remove();
    });

    // Append buttons to the container
    buttonContainer.appendChild(undoButton);
    buttonContainer.appendChild(restartButton);

    // Append the container to the checkStatusDiv
    checkStatusDiv.appendChild(buttonContainer);
}

// Initial setup: save the initial game state and render the board
saveCurrentGameState();
renderBoard();
