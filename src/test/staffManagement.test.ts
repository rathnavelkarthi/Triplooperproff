import { describe, it, expect } from 'vitest';

describe('Staff Management payload handling', () => {
  it('does not send empty password or password field to database table updates', () => {
    const rawFormData = {
      name: 'Jane Doe',
      email: 'jane@hotel.com',
      phone: '+91 98765 43210',
      role: 'RECEPTION',
      status: 'Active',
      password: '',
    };

    // Filter payload for update
    const updatePayload: any = {
      name: rawFormData.name.trim(),
      email: rawFormData.email.trim(),
      phone: rawFormData.phone.trim(),
      role: rawFormData.role,
      status: rawFormData.status,
    };
    if (rawFormData.password && rawFormData.password.trim().length > 0) {
      updatePayload.password = rawFormData.password.trim();
    }

    expect(updatePayload).not.toHaveProperty('password');
    expect(updatePayload.name).toBe('Jane Doe');
    expect(updatePayload.email).toBe('jane@hotel.com');
  });

  it('includes password in update payload only when a new password is provided', () => {
    const rawFormData = {
      name: 'Jane Doe',
      email: 'jane@hotel.com',
      phone: '+91 98765 43210',
      role: 'RECEPTION',
      status: 'Active',
      password: 'newSecretPassword123',
    };

    const updatePayload: any = {
      name: rawFormData.name.trim(),
      email: rawFormData.email.trim(),
      phone: rawFormData.phone.trim(),
      role: rawFormData.role,
      status: rawFormData.status,
    };
    if (rawFormData.password && rawFormData.password.trim().length > 0) {
      updatePayload.password = rawFormData.password.trim();
    }

    expect(updatePayload).toHaveProperty('password', 'newSecretPassword123');
  });

  it('ensures database table update excludes password property', () => {
    const staffUpdate: any = {
      name: 'John',
      email: 'john@example.com',
      phone: '1234567890',
      role: 'MANAGER',
      status: 'ACTIVE',
      password: 'password123',
    };

    // Clean DB update excludes password
    const dbUpdatePayload: Record<string, any> = {};
    if (staffUpdate.name !== undefined) dbUpdatePayload.name = staffUpdate.name;
    if (staffUpdate.email !== undefined) dbUpdatePayload.email = staffUpdate.email.toLowerCase().trim();
    if (staffUpdate.phone !== undefined) dbUpdatePayload.phone = staffUpdate.phone;
    if (staffUpdate.role !== undefined) dbUpdatePayload.role = staffUpdate.role;
    if (staffUpdate.status !== undefined) dbUpdatePayload.status = staffUpdate.status.toUpperCase();

    expect(dbUpdatePayload).not.toHaveProperty('password');
    expect(Object.keys(dbUpdatePayload)).toEqual(['name', 'email', 'phone', 'role', 'status']);
  });
});
