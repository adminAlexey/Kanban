export const UserStorage = {
    get() {
        return localStorage.getItem('username');
    },
    set(username) {
        localStorage.setItem('username', username);
    }
};

export const BoardStorage = {
    getActual() {
        return localStorage.getItem('actualBoardId');
    },
    setActual(id) {
        localStorage.setItem('actualBoardId', id);
    },
    getLast() {
        return localStorage.getItem('lastBoardId');
    },
    setLast(id) {
        localStorage.setItem('lastBoardId', id);
    }
};

export const ColumnSortStorage = {
    get() {
        return JSON.parse(localStorage.getItem('columnSort') || '{}');
    },
    set(state) {
        localStorage.setItem('columnSort', JSON.stringify(state));
    }
};