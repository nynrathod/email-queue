import { useState } from "react";
import "./index.css";

function Home() {
	const [user1ToAddress, setUser1ToAddress] = useState("nayan@intellect.co");
	const [user2ToAddress, setUser2ToAddress] = useState("nayan@intellect.co");

	const handleLogin = async (provider: string) => {
		try {
			const response = await fetch(`http://localhost:5000/auth/${provider}/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					redirect_url: "http://localhost:5173/auth/success",
				}),
			});
			const data = await response.json();

			if (data.auth_url) {
				const popup = window.open(
					data.auth_url,
					`${provider} Login`,
					"width=500,height=600"
				);

				const interval = setInterval(() => {
					if (!popup || popup.closed) {
						clearInterval(interval);
						console.log("Popup closed, checking login status...");

						if (localStorage.getItem("auth_success") === "true") {
							console.log("Account linked successfully!");
						} else {
							console.log("Login failed or not completed.");
						}
					}
				}, 500);
			}
		} catch (error) {
			console.error("Error fetching auth URL:", error);
		}
	};

	const handleSendEmail = async (userId: string, tenantId: string, toAddress: string) => {
		console.log("mydata", userId, tenantId, toAddress)
		try {
			const response = await fetch("http://localhost:5000/email/send-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					user_id: userId,
					tenant_id: tenantId,
					to: toAddress,
					subject: "Test Email",
					body: "This is a test email from your microservice.",
				}),
			});
			const data = await response.json();
			console.log("Send email response:", data);
		} catch (error) {
			console.error("Error sending email:", error);
		}
	};

	return (
		<div className="container">
			<div className="grid">
				<h3>User 1</h3>
				<button onClick={() => handleLogin("google")}>Link Google account</button>
				<input
					type="email"
					value={user1ToAddress}
					onChange={(e) => setUser1ToAddress(e.target.value)}
					placeholder="Enter recipient email"
				/>
				<button onClick={() => handleSendEmail("google_userid", "google_tenantid", user1ToAddress)}>
					Send email
				</button>
			</div>
			<div className="grid">
				<h3>User 2</h3>
				<button onClick={() => handleLogin("microsoft")}>Link Microsoft account</button>
				<input
					type="email"
					value={user2ToAddress}
					onChange={(e) => setUser2ToAddress(e.target.value)}
					placeholder="Enter recipient email"
				/>
				<button onClick={() => handleSendEmail("microsoft_userid", "microsoft_tenantid", user2ToAddress)}>
					Send email
				</button>
			</div>
		</div>
	);
}

export default Home;
