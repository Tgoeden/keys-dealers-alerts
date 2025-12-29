import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://vdliemazpocbecmhzpbr.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjE0NjE0MjI1LTBhMjUtNDBkNy04MjRkLTVjZTI2MTA0ZjIwNiJ9.eyJwcm9qZWN0SWQiOiJ2ZGxpZW1henBvY2JlY21oenBiciIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY2MjQ0MDA2LCJleHAiOjIwODE2MDQwMDYsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.dvg66_nD6UDYwPsri155vW_eimfzRHQwBqgjA1RxjVs';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };