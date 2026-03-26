def render(candidate_name: str, job_title: str, company_name: str) -> dict:
    return {
        "subject": f"Your Application for {job_title} at {company_name}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3748;">Application Update</h2>
            <p>Hi {candidate_name},</p>
            <p>
                Thank you for applying for <strong>{job_title}</strong>
                at <strong>{company_name}</strong>.
            </p>
            <p>
                After careful consideration, we've decided to move forward
                with other candidates at this time. We encourage you to
                apply for future openings that match your profile.
            </p>
            <br/>
            <p style="color: #718096; font-size: 13px;">
                This is an automated message from BrightHire.
                Please do not reply to this email.
            </p>
        </div>
        """
    }