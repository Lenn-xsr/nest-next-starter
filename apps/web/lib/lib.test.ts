import { describe, expect, it } from 'vitest';
import { ApiError } from './api/client';
import { errorMessage } from './api/error-message';
import { redirectFor } from './auth/routes';
import { describeAgent, initials } from './format';

describe('redirectFor (middleware gate)', () => {
  it('sends a visitor without a cookie to the login page', () => {
    expect(redirectFor('/team', false)).toBe('/login');
    expect(redirectFor('/', false)).toBe('/login');
  });

  it('lets a visitor without a cookie stay on the login page', () => {
    expect(redirectFor('/login', false)).toBeNull();
  });

  it('skips the login page and the bare root for a signed-in visitor', () => {
    expect(redirectFor('/login', true)).toBe('/team');
    expect(redirectFor('/', true)).toBe('/team');
  });

  it('lets a signed-in visitor through to app pages', () => {
    expect(redirectFor('/settings', true)).toBeNull();
  });
});

describe('errorMessage', () => {
  const problem = (type: string, title: string) =>
    new ApiError({ type, title, status: 400, detail: null, instance: '' });

  it('uses friendly copy for known error codes', () => {
    expect(errorMessage(problem('ADMIN_ALREADY_EXISTS', 'x'))).toBe(
      'Someone with this email is already on the team.',
    );
  });

  it('falls back to the API title for unknown codes', () => {
    expect(errorMessage(problem('SOMETHING_NEW', 'Explained by the API'))).toBe(
      'Explained by the API',
    );
  });

  it('never leaks a raw non-API error', () => {
    expect(errorMessage(new TypeError('fetch failed at 10.0.0.3'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

describe('initials', () => {
  it('uses first and last name', () => {
    expect(initials('Jane Mary Doe', 'jane@example.com')).toBe('JD');
  });

  it('uses the first two letters of a single name', () => {
    expect(initials('Jane', 'jane@example.com')).toBe('JA');
  });

  it('derives them from the email when there is no name', () => {
    expect(initials(null, 'john.smith@example.com')).toBe('JS');
    expect(initials('  ', 'root@example.com')).toBe('RO');
  });
});

describe('describeAgent', () => {
  it('names the browser and operating system', () => {
    expect(
      describeAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome on Windows');
    expect(
      describeAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      ),
    ).toBe('Safari on macOS');
    expect(
      describeAgent(
        'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
      ),
    ).toBe('Firefox on Linux');
  });

  it('does not mistake Edge for Chrome', () => {
    expect(
      describeAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
      ),
    ).toBe('Edge on Windows');
  });

  it('has a fallback for unrecognized clients', () => {
    expect(describeAgent('curl/8.5.0')).toBe('Unknown device');
  });
});
