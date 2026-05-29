import {configureStore} from '@reduxjs/toolkit';
import {combineReducers} from 'redux';
import {appContextReducer} from './slices/app-context/app-context.reducer';
import {memoryReducer} from './slices/memory/memory.reducer';

const rootReducer = combineReducers({
	appContextReducer,
	memoryReducer
});

export const configureTestStore = (
	preloadedState?: Partial<ReturnType<typeof rootReducer>>
) =>
	configureStore({
		reducer: rootReducer,
		preloadedState: preloadedState as ReturnType<typeof rootReducer>
	});
