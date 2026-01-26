import '@testing-library/jest-dom';
import React from 'react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sun: () => React.createElement('div', { 'data-testid': 'icon-sun' }),
  Moon: () => React.createElement('div', { 'data-testid': 'icon-moon' }),
  Settings: () => React.createElement('div', { 'data-testid': 'icon-settings' }),
  Send: () => React.createElement('div', { 'data-testid': 'icon-send' }),
  Paperclip: () => React.createElement('div', { 'data-testid': 'icon-paperclip' }),
  ChevronDown: () => React.createElement('div', { 'data-testid': 'icon-chevron-down' }),
  PlusCircle: () => React.createElement('div', { 'data-testid': 'icon-plus-circle' }),
  FileText: () => React.createElement('div', { 'data-testid': 'icon-file-text' }),
  File: () => React.createElement('div', { 'data-testid': 'icon-file' }),
  Globe: () => React.createElement('div', { 'data-testid': 'icon-globe' }),
}));
