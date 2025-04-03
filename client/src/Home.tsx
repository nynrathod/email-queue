function Home() {
    const handleGoogleLogin = async () => {
        try {
            const redirectUrl = encodeURIComponent("http://localhost:5173/auth/success");
            const response = await fetch(`http://localhost:5000/auth/google/login?redirect_url=${redirectUrl}`);
            const data = await response.json();

            if (data.auth_url) {
                const popup = window.open(
                    data.auth_url,
                    "Google Login",
                    "width=500,height=600"
                );

                const interval = setInterval(() => {
                    if (!popup || popup.closed) {
                        clearInterval(interval);
                        console.log("Popup closed, checking login status...");

                        if (localStorage.getItem("auth_success") === "true") {
                            localStorage.removeItem("auth_success");
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

    return (
        <div>
            <button onClick={handleGoogleLogin}>Login with Google</button>
        </div>
    );
}

export default Home;
