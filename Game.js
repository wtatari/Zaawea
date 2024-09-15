// game.js

import { BOARD_SIZE } from './Constants.js';
import { Triangle, Square, Hexagon, Octagon } from './Piece.js';
import { getAIMove } from './AI.js'; // Import the AI module

let selectedPiece = null;
let selectedPosition = null;
let highlightedMoves = [];
let currentPlayer = 'red'; // Game starts with red player
let moveHistory = [];
let gameStateHistory = [];
let gameMode = 'human-vs-ai'; // Default to human vs AI mode
let aiColor = 'black'; // AI plays as black

// Helper function to get piece letter
function getPieceLetter(piece) {
    switch (piece.shape) {
        case 'triangle': return 'T';
        case 'square': return 'S';
        case 'hexagon': return 'H';
        case 'octagon': return 'O';
        default: return '';
    }
}

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

// Function to initialize the board
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

// Initialize the board with pieces
let board = initializeBoard();

// Check if a player has won by merging two octagons
function checkWinByMergingOctagons(piece) {
    // Ensure it's only octagons
    if (!(piece instanceof Octagon)) return;

    const octagonCount = board.flat().filter(tile => tile instanceof Octagon && tile.color === piece.color).length;

    // The player wins only when there's exactly 1 octagon left after the merge
    if (octagonCount === 1) {  
        alert(`${piece.color.toUpperCase()} player wins by merging two octagons!`);
        resetGame();
    }
}

// Check if a player has lost by losing all their octagons
function checkLoseCondition() {
    const redOctagons = board.flat().filter(tile => tile instanceof Octagon && tile.color === 'red').length;
    const blackOctagons = board.flat().filter(tile => tile instanceof Octagon && tile.color === 'black').length;

    if (redOctagons === 0) {
        alert('BLACK player wins! RED has no octagons left.');
        resetGame();
    } else if (blackOctagons === 0) {
        alert('RED player wins! BLACK has no octagons left.');
        resetGame();
    }
}

// Render the board
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
                checkWinByMergingOctagons(move.merge); // Check if merging octagons causes a win
            } else if (move.eat) {
                if (move.both) {
                    // Both pieces are removed
                    board[row][col] = null;
                    board[selectedPosition.row][selectedPosition.col] = null;
                } else {
                    // Remove the target piece and move the selected piece
                    board[row][col] = selectedPiece;
                    board[selectedPosition.row][selectedPosition.col] = null;
                }
            } else {
                // Just move the selected piece
                board[row][col] = selectedPiece;
                board[selectedPosition.row][selectedPosition.col] = null;
            }

            // Record the move
            recordMove(selectedPiece, from, { row, col });

            // Switch player after a successful move
            currentPlayer = currentPlayer === 'red' ? 'black' : 'red';

            // Save current state for undo
            saveCurrentGameState();

            checkLoseCondition(); // Check if any player has lost all octagons
        }

        selectedPiece = null;
        selectedPosition = null;
        highlightedMoves = [];
    } else if (piece && piece.color === currentPlayer) {
        // Select a new piece and highlight its moves
        selectedPiece = piece;
        selectedPosition = { row, col };
        highlightedMoves = selectedPiece.getValidMoves(row, col, board);
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

        checkLoseCondition(); // Check if any player has lost all octagons

        // Render the board after AI move
        renderBoard();
    } else {
        alert('AI has no valid moves! You win!');
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
        } else {
            alert("Cannot undo any further!");
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
        } else {
            alert("Cannot undo any further!");
        }
    }
}

// Add an undo button functionality
document.getElementById('undo-btn').addEventListener('click', undoLastMove);

// Reset game
function resetGame() {
    selectedPiece = null;
    selectedPosition = null;
    highlightedMoves = [];
    currentPlayer = 'red';
    board = initializeBoard();
    gameStateHistory = []; // Clear the game state history
    moveHistory = [];      // Clear the move history
    saveCurrentGameState(); // Save the initial state
    renderBoard();
}

// Add event listener for reset button
document.getElementById('reset-btn').addEventListener('click', resetGame);

// Add event listener to select game mode
document.getElementById('mode-select').addEventListener('change', function(event) {
    gameMode = event.target.value;
    resetGame();
});

// Initial render and save the initial state
saveCurrentGameState();
renderBoard();
