import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/components/ChatInput';
import { UI_TEXT } from '@/lib/constants';

describe('ChatInput', () => {
  const mockOnSend = jest.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
  });

  it('renders input field with default placeholder', () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    const input = screen.getByTestId('chat-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', UI_TEXT.INPUT_PLACEHOLDER);
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Type your question...';
    render(<ChatInput onSend={mockOnSend} placeholder={customPlaceholder} />);
    
    const input = screen.getByTestId('chat-input');
    expect(input).toHaveAttribute('placeholder', customPlaceholder);
  });

  it('calls onSend with input value when send button is clicked', () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    expect(mockOnSend).toHaveBeenCalledWith('Test message');
    expect(input).toHaveValue('');
  });

  it('calls onSend when Enter key is pressed', () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    const input = screen.getByTestId('chat-input');
    
    fireEvent.change(input, { target: { value: 'Enter test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockOnSend).toHaveBeenCalledWith('Enter test');
  });

  it('does not call onSend when input is empty', () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);
    
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('trims whitespace from input before sending', () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    const input = screen.getByTestId('chat-input');
    
    fireEvent.change(input, { target: { value: '  Trimmed message  ' } });
    fireEvent.click(screen.getByTestId('send-button'));
    
    expect(mockOnSend).toHaveBeenCalledWith('Trimmed message');
  });

  it('disables input and button when disabled prop is true', () => {
    render(<ChatInput onSend={mockOnSend} disabled />);
    
    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');
    
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });
});
