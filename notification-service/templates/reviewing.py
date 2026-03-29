def render(candidate_name: str, job_title: str, company_name: str) -> dict:
    return {
        "subject": f"Application is in Review — {job_title} at {company_name}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3748;">Application Received</h2>
            <p>Hi {candidate_name},</p>
            <p>
               Your application for the role <strong>{job_title}</strong>
                at <strong>{company_name}</strong> is in review. 
            </p>
            <p>
                Our team will review your profile and get back to you shortly.
                You can track your application status by logging into BrightHire.
            </p>
            <br/>
            <p style="color: #718096; font-size: 13px;">
                This is an automated message from BrightHire.
                Please do not reply to this email.
            </p>
        </div>
        """
    }