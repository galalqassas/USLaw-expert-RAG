import { render, screen } from '@testing-library/react';
import { FileTypeBadge } from '@/components/FileTypeBadge';
import { FILE_TYPE_CONFIG } from '@/lib/constants';
import { FileType } from '@/types';

describe('FileTypeBadge', () => {
  const fileTypes: FileType[] = ['pdf', 'docx', 'web'];

  it.each(fileTypes)('renders %s badge with correct label', (type) => {
    render(<FileTypeBadge type={type} />);
    
    const badge = screen.getByTestId(`file-badge-${type}`);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(FILE_TYPE_CONFIG[type].label);
  });

  it('applies correct styling and icon for PDF', () => {
    render(<FileTypeBadge type="pdf" />);
    
    const badge = screen.getByTestId('file-badge-pdf');
    expect(badge).toHaveClass('bg-red-100');
    expect(badge).toHaveClass('text-red-700');
    expect(screen.getByTestId('icon-file-text')).toBeInTheDocument();
  });

  it('applies correct styling and icon for DOCX', () => {
    render(<FileTypeBadge type="docx" />);
    
    const badge = screen.getByTestId('file-badge-docx');
    expect(badge).toHaveClass('bg-blue-100');
    expect(badge).toHaveClass('text-blue-700');
    expect(screen.getByTestId('icon-file')).toBeInTheDocument();
  });

  it('applies correct styling and icon for WEB', () => {
    render(<FileTypeBadge type="web" />);
    
    const badge = screen.getByTestId('file-badge-web');
    expect(badge).toHaveClass('bg-green-100');
    expect(badge).toHaveClass('text-green-700');
    expect(screen.getByTestId('icon-globe')).toBeInTheDocument();
  });
});
