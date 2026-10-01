import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireGuest } from '@/core/auth';
import { DEMO_PASSWORD } from '@/mocks/fixtures/users';
import { render, screen } from '@/test/render';

import { Component as LoginPage } from './login';

const renderLogin = (query = 'returnTo=%2Fitems') =>
  render(
    <RequireGuest>
      <LoginPage />
    </RequireGuest>,
    {
      auth: 'anonymous',
      path: '/login',
      route: `/login?${query}`,
      routes: [
        { path: '/items', element: <p>Items page</p> },
        { path: '/dashboard', element: <p>Dashboard page</p> },
      ],
    },
  );

describe('Login page', () => {
  it('signs in and returns to the page the user wanted', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Items page')).toBeInTheDocument();
  });

  it.each([
    ['a protocol-relative URL', 'returnTo=%2F%2Fevil.example'],
    ['a path with a tab that browsers drop', 'returnTo=%2F%09%2Fevil.example'],
  ])('never leaves the site after signing in, even with %s as returnTo', async (_name, query) => {
    const user = userEvent.setup();
    const { router } = renderLogin(query);

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('shows a translated message for wrong credentials', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });

  it('validates before calling the API', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });
});
