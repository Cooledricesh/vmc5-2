import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button Component', () => {
  it('renders correctly with given children', () => {
    // Arrange
    const buttonText = 'Click me';

    // Act
    render(<Button>{buttonText}</Button>);

    // Assert
    const button = screen.getByRole('button', { name: buttonText });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(buttonText);
  });

  it('fires onClick event when clicked', () => {
    // Arrange
    const handleClick = vi.fn();
    const buttonText = 'Click me';

    // Act
    render(<Button onClick={handleClick}>{buttonText}</Button>);
    const button = screen.getByRole('button', { name: buttonText });
    fireEvent.click(button);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when the disabled prop is true', () => {
    // Arrange
    const handleClick = vi.fn();
    const buttonText = 'Disabled Button';

    // Act
    render(
      <Button disabled={true} onClick={handleClick}>
        {buttonText}
      </Button>
    );
    const button = screen.getByRole('button', { name: buttonText });
    fireEvent.click(button);

    // Assert
    expect(button).toBeDisabled();
    expect(handleClick).not.toHaveBeenCalled();
  });
});