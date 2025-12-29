import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '../RegisterForm'
import type { RegisterFormData } from '../../types'

describe('RegisterForm', () => {
  const mockOnSubmit = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders register form with all required fields', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
    // Check for the description specifically
    expect(screen.getByText('Sign up to start managing your documents')).toBeInTheDocument()
  })

  it('validates required fields on submit', async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Username is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    // Fill in invalid email and valid other fields
    await user.type(emailInput, 'invalid-email')
    await user.type(usernameInput, 'validuser')
    await user.type(passwordInput, 'validpassword123')
    await user.type(confirmPasswordInput, 'validpassword123')
    await user.click(submitButton)

    // Check that form validation prevents submission
    expect(mockOnSubmit).not.toHaveBeenCalled()
    
    // The form should prevent submission with invalid email
    expect(emailInput).toHaveValue('invalid-email')
  })

  it('validates username length', async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const usernameInput = screen.getByLabelText(/username/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(usernameInput, 'ab')
    await user.click(submitButton)

    expect(screen.getByText('Username must be at least 3 characters long')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates password length', async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(passwordInput, '1234567')
    await user.click(submitButton)

    expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates password confirmation match', async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password456')
    await user.click(submitButton)

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('clears field errors when user starts typing', async () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    // Trigger validation error
    await user.click(submitButton)
    expect(screen.getByText('Email is required')).toBeInTheDocument()

    // Start typing to clear error
    await user.type(emailInput, 'test@example.com')
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
  })

  it('submits form with valid data (excluding confirmPassword)', async () => {
    const formData: RegisterFormData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      confirmPassword: 'password123',
      full_name: 'Test User'
    }

    const expectedSubmitData = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
      full_name: formData.full_name
    }

    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const usernameInput = screen.getByLabelText(/username/i)
    const fullNameInput = screen.getByLabelText(/full name/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(emailInput, formData.email)
    await user.type(usernameInput, formData.username)
    await user.type(fullNameInput, formData.full_name || '')
    await user.type(passwordInput, formData.password)
    await user.type(confirmPasswordInput, formData.confirmPassword)
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expectedSubmitData)
    })
  })

  it('submits form without full_name when not provided', async () => {
    const formData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      confirmPassword: 'password123'
    }

    const expectedSubmitData = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
      full_name: ''
    }

    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(emailInput, formData.email)
    await user.type(usernameInput, formData.username)
    await user.type(passwordInput, formData.password)
    await user.type(confirmPasswordInput, formData.confirmPassword)
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expectedSubmitData)
    })
  })

  it('shows loading state when isLoading is true', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} isLoading={true} />)

    const submitButton = screen.getByRole('button', { name: /creating account/i })
    const inputs = screen.getAllByRole('textbox')
    const passwordInputs = screen.getAllByLabelText(/password/i)

    expect(submitButton).toBeDisabled()
    inputs.forEach(input => expect(input).toBeDisabled())
    passwordInputs.forEach(input => expect(input).toBeDisabled())
  })

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Registration failed'
    render(<RegisterForm onSubmit={mockOnSubmit} error={errorMessage} />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    expect(passwordInput).toHaveAttribute('aria-invalid', 'false')
  })
})