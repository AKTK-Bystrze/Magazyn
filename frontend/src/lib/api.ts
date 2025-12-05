const BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';

export const api = {
  post: async <T>(url: string, data: any): Promise<{ data: T }> => {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw errorData;
    }

    const resData = await response.json();
    return { data: resData };
  },
};
